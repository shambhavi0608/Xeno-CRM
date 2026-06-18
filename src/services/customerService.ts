/**
 * 1. FILE NAME: src/services/customerService.ts
 * 
 * 2. COMPLETE CODE / DESCRIPTION:
 * High-performance, strictly-typed domain service that abstracts standard Firestore CRM operations 
 * and custom server endpoints for managing Customer and Order profiles.
 */

// 3. IMPORTS
import { 
  fetchCustomers, 
  fetchCustomerDetails, 
  createCustomer, 
  ingestCustomerData, 
  deleteCustomer,
  fetchCustomer360
} from '../lib/api.js';
import { Customer, Order, Customer360Data } from '../types/index.js';

// 5. TYPES & DTOs
export interface BulkIngestPayload {
  customers?: Partial<Customer>[];
  orders?: Partial<Order>[];
}

export interface BulkIngestResponse {
  success: boolean;
  insertedCustomers: number;
  insertedOrders: number;
}

export interface CustomerDetailsResponse {
  customer: Customer;
  orders: Order[];
}

// 4. EXPORTS & IMPLEMENTATION
export const customerService = {
  /**
   * 6. FIRESTORE QUERY REFERENCE:
   * Collection: /users/{uid}/customers
   * Queries, filters, and computes real-time RFM-driven standard customer profiles.
   */
  async list(search = '', tag = 'all'): Promise<Customer[]> {
    // 7. ERROR HANDLING
    try {
      return await fetchCustomers(search, tag);
    } catch (error) {
      console.error('[customerService.list] Failed to fetch customer collection:', error);
      throw new Error('Could not retrieve customers. Please check database permissions.');
    }
  },

  /**
   * 6. FIRESTORE QUERY REFERENCE:
   * Document: /users/{uid}/customers/{id}
   * Collection: /users/{uid}/orders
   * Retrieve unique customer metrics and chronological transaction receipts.
   */
  async get(id: string): Promise<CustomerDetailsResponse> {
    // 7. ERROR HANDLING
    try {
      if (!id) throw new Error('Customer ID is required');
      const details = await fetchCustomerDetails(id);
      return details as CustomerDetailsResponse;
    } catch (error) {
      console.error(`[customerService.get] Failed for ID ${id}:`, error);
      throw new Error(`Could not access details for customer ID: ${id}`);
    }
  },

  /**
   * 6. FIRESTORE QUERY REFERENCE:
   * Document: /users/{uid}/customers/{id}
   * Retrieve the Customer 360 detailed metrics, AI insights, and chronological timeline.
   */
  async get360(id: string): Promise<Customer360Data> {
    // 7. ERROR HANDLING
    try {
      if (!id) throw new Error('Customer ID is required');
      return await fetchCustomer360(id);
    } catch (error) {
      console.error(`[customerService.get360] Failed to build 360 view for ID ${id}:`, error);
      throw new Error(`Could not retrieve 360-degree analytics for customer ID: ${id}`);
    }
  },

  /**
   * 6. FIRESTORE QUERY REFERENCE:
   * Document: /users/{uid}/customers/{random_id} (write operation)
   * Create or update a customer profile in Firestore CRM.
   */
  async create(customerSubset: Omit<Customer, 'id' | 'memberSince'>): Promise<Customer> {
    // 7. ERROR HANDLING
    try {
      if (!customerSubset.name || !customerSubset.email) {
        throw new Error('Name and Email are mandatory fields for new customer creation.');
      }
      return await createCustomer(customerSubset);
    } catch (error) {
      console.error('[customerService.create] Insertion failure:', error);
      throw new Error('Failed to create new customer. Ensure inputs strictly match type metrics.');
    }
  },

  /**
   * 6. FIRESTORE QUERY REFERENCE:
   * Document: /users/{uid}/customers/{id} (delete operation)
   * Delete a specific customer profile from CRM database.
   */
  async delete(id: string): Promise<void> {
    // 7. ERROR HANDLING
    try {
      if (!id) throw new Error('Customer ID is required for deletion');
      await deleteCustomer(id);
    } catch (error) {
      console.error(`[customerService.delete] Failed to delete customer ID ${id}:`, error);
      throw new Error('Could not request deletion. Verify Firestore administrative security rules.');
    }
  },

  /**
   * 6. FIRESTORE QUERY REFERENCE:
   * Collection: /users/{uid}/customers (batch write)
   * Collection: /users/{uid}/orders (batch write)
   * Ingest arrays of fresh customer profiles and backfilled order transactions.
   */
  async bulkIngest(payload: BulkIngestPayload): Promise<BulkIngestResponse> {
    // 7. ERROR HANDLING
    try {
      const response = await ingestCustomerData(payload);
      return {
        success: response?.success ?? true,
        insertedCustomers: response?.insertedCustomers ?? payload.customers?.length ?? 0,
        insertedOrders: response?.insertedOrders ?? payload.orders?.length ?? 0
      };
    } catch (error) {
      console.error('[customerService.bulkIngest] Failed batch ingestion transaction:', error);
      throw new Error('Bulk insert operation aborted due to network or validation errors.');
    }
  }
};
