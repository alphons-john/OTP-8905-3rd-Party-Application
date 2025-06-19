/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
/**********************************************************************************************
*************** 
*
*
*
${OTP-8905}:{Send Sales Order Details to 3rd party application}
*
*
**************************************************************************************************
*
*Author:Jobin and Jismi IT Services
*
*Date Created:10-June-2025
*
*Description:Develop multiple APIs for third-party application integration. Implement Token-Based
*Authentication to ensure secure and controlled access. APIs will handle fetching, creating, updating,
*and deleting sales orders and fulfillments while maintaining data integrity and security.
*
** REVISION HISTORY
 *
* @version 1.0 10-June-2025 : Created the initial build by JJ0403
**************************************************************************************************
******************/

define(['N/record', 'N/search', 'N/log'],
    (record, search, log) => {

         /**
         * Defines the function that is executed when a POST request is sent to a RESTlet.
         * @param {string | Object} requestBody - The HTTP request body; request body is passed 
         * as a string when request Content-Type is 'text/plain' or parsed into an Object when 
         * request Content-Type is 'application/json' (in which case
         *     the body must be a valid JSON)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type
         *  is 'text/plain'; returns an Object when request Content-Type is 'application/json' or 
         * 'application/xml'
         * @since 2015.2
         * ${OTP-8907}:{Create API for creating the Item Fulfillment}
         */
        const post = (requestBody) => {
            return JSON.stringify(createItemFulfillment(requestBody.salesRecId));
        };

        /**
         * Defines the function that is executed when a GET request is sent to a RESTlet.
         * @param {Object} requestParams - Parameters from HTTP request URL; parameters passed
         *  as an Object (for all supported
         *     content types)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 
         * 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         * ${OTP-8906}:{Create API for the fetching the Sales order details}

         */
        const get = (requestParams) => {
            if (requestParams.tranid) {
                return JSON.stringify(fetchSalesOrderDetails(requestParams.tranid));
            } else {
                return JSON.stringify(fetchOpenSalesOrders());
            }
        };

        /**
         * Defines the function that is executed when a PUT request is sent to a RESTlet.
         * @param {string | Object} requestBody - The HTTP request body; request body are passed as 
         * a string when request
         *     Content-Type is 'text/plain' or parsed into an Object when request Content-Type is 
         * 'application/json' (in which case
         *     the body must be a valid JSON)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 
         * 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         * ${OTP-8908}:{Create API for updating the Item Fulfillment}
         */
        const put = (requestBody) => {
            return JSON.stringify(updateItemFulfillment(requestBody.tranid, requestBody.memo));
        };

        /**
         * Defines the function that is executed when a DELETE request is sent to a RESTlet.
         * @param {Object} requestParams - Parameters from HTTP request URL; parameters are passed as an
         *  Object (for all supported
         *     content types)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is
         *  'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         * ${OTP-8909}:{API for the Deleting the Item fulfillment}
         */
        const doDelete = (requestParams) => {
            return JSON.stringify(deleteItemFulfillment(requestParams.recordId));
        };

        /**
         * Creates an item fulfillment record based on a sales order ID.
         * @param {number} salesOrderId - The internal ID of the sales order.
         * @returns {Object} JSON response with success or error status.
         */
        const createItemFulfillment = (salesOrderId) => {
            try {
                let itemFulfillmentRec = record.transform({
                    fromType: record.Type.SALES_ORDER,
                    fromId: salesOrderId,
                    toType: record.Type.ITEM_FULFILLMENT,
                    isDynamic: true
                });

                let itemFulfillmentId = itemFulfillmentRec.save({
                    ignoreMandatoryFields: true
                });

                return {
                    status: "successful",
                    newId: itemFulfillmentId,
                    message: "Created fulfillment record successfully"
                };

            } catch (error) {
                log.error('Error creating item fulfillment', error);
                return {
                    status: 'failed',
                    message: error.message
                };
            }
        };

        /**
         * Retrieves sales order details.
         * @param {string} salesOrderId - The internal ID of the sales order.
         * @returns {Object} JSON response with sales order details.
         */
        const fetchSalesOrderDetails = (salesOrderId) => {
            try {
                let salesOrderRecord = record.load({
                    type: record.Type.SALES_ORDER,
                    id: salesOrderId
                });

                let totalLines = salesOrderRecord.getLineCount({ sublistId: 'item' });
                log.debug('Total line items', totalLines);

                let lineItems = [];
                for (let i = 0; i < totalLines; i++) {
                    lineItems.push({
                        itemName: salesOrderRecord.getSublistText({ sublistId: 'item', fieldId: 'item', line: i }),
                        quantity: salesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i }),
                        rate: salesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: i }),
                        grossAmount: salesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'amount', line: i })
                    });
                }

                return {
                    status: "successful",
                    message: "Successfully retrieved sales order details",
                    data: lineItems
                };

            } catch (error) {
                log.error('Error retrieving sales order', error);
                return {
                    status: "failed",
                    message: "RESULT: NOT FOUND"
                };
            }
        };
        const fetchOpenSalesOrders = () => {
            try {
                let salesOrderSearch = search.create({
                    type: search.Type.SALES_ORDER,
                    filters: [
                        ['mainline', 'is', 'true'], 'AND',
                        ['status', 'anyof', ['SalesOrd:B', 'SalesOrd:D', 'SalesOrd:E', 'SalesOrd:F']]
                    ],

                    columns: [
                        search.createColumn({ name: 'internalid' }),
                        search.createColumn({ name: 'tranid' }),
                        search.createColumn({ name: 'trandate' }),
                        search.createColumn({ name: 'total' })
                    ]
                });

                let salesOrders = [];
                salesOrderSearch.run().each(result => {
                    salesOrders.push({
                        internalId: result.getValue('internalid'),
                        documentNumber: result.getValue('tranid'),
                        date: result.getValue('trandate'),
                        totalAmount: result.getValue('total')
                    });
                    return true; 
                });

                return {
                    status: "successful",
                    message: "Fetched all open sales orders",
                    data: salesOrders
                };

            } catch (error) {
                log.error('Error retrieving open sales orders', error);
                return {
                    status: "failed",
                    message: "RESULT: NOT FOUND"
                };
            }
        }

        /**
         * Updates an item fulfillment record.
         * @param {number} fulfillmentId - The internal ID of the item fulfillment record.
         * @param {string} memoText - Memo value to update.
         * @returns {Object} JSON response confirming the update.
         */
        const updateItemFulfillment = (fulfillmentId, memoText) => {
            try {
                let updatedItemFulfillment = record.submitFields({
                    type: record.Type.ITEM_FULFILLMENT,
                    id: fulfillmentId,
                    values: { memo: memoText },
                    options: { enableSourcing: true, ignoreMandatoryFields: true }
                });

                return {
                    status: "successful",
                    updatedId: updatedItemFulfillment,
                    message: "Updated fulfillment record successfully"
                };

            } catch (error) {
                log.error('Error updating fulfillment record', error);
                return {
                    status: "failed",
                    message: "RESULT: NOT FOUND"
                };
            }
        };

        /**
         * Deletes an item fulfillment record.
         * @param {number} fulfillmentId - The internal ID of the fulfillment record.
         * @returns {Object} JSON response confirming the deletion.
         */
        const deleteItemFulfillment = (fulfillmentId) => {
            try {
                record.delete({
                    type: record.Type.ITEM_FULFILLMENT,
                    id: fulfillmentId
                });

                return {
                    status: "success",
                    message: "Deleted fulfillment record successfully"
                };

            } catch (error) {
                log.error('Error deleting fulfillment record', error);
                return {
                    status: "failed",
                    message: error.message
                };
            }
        };

        return { post, get, put, delete: doDelete };
    }
);