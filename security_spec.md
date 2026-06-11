# Security Specification & Invariants (TDD Specification)

This specification defines the security rules, invariants, and test payload assertions for the AI-Native Mini CRM Firestore implementation under `/users/{userId}`.

## 1. Core Data Invariants

1. **User Splitting / Isolation**: Any access (read, create, update, delete) to subcollections under `/users/{userId}/*` requires that the authenticated client UID (`request.auth.uid`) matches the `{userId}` path argument.
2. **Type Safety & Structural Validation**: Every write operation (create, update) must satisfy properties validation:
   - Customers: ID format validation, spending >= 0, proper tags array structure.
   - Campaigns: Status restrictions (`draft`, `active`, `completed`, `paused`), positive metrics.
   - Orders: Positive amounts, list of non-empty item descriptions.
3. **Temporal Integrity**: Fields like `createdAt` are immutable after document creation.
4. **Verified Users Constraint**: Non-admin write operations require verified email (`request.auth.token.email_verified == true`).

## 2. The "Dirty Dozen" Threat Payloads (Negative Test Vectors)

| ID | Collection | Target Path | Description / Vulnerability Code | Expected Result |
|----|------------|------------|----------------------------------|-----------------|
| T1 | Users | `/users/victim_1` | Attacking user tries to create/overwrite victim's core profile | `PERMISSION_DENIED` |
| T2 | Customers | `/users/victim_1/customers/c_1` | Attacker attempts to list/read private customer directories of another user | `PERMISSION_DENIED` |
| T3 | Customers | `/users/user_1/customers/c_1` | User attempts to inject a Malicious 1MB string into Customer ID field | `PERMISSION_DENIED` |
| T4 | Customers | `/users/user_1/customers/c_1` | User attempts to save negative value in `totalSpent` | `PERMISSION_DENIED` |
| T5 | Campaigns | `/users/user_1/campaigns/cmp_1` | Email-unverified visitor attempts to create a CRM marketing campaign | `PERMISSION_DENIED` |
| T6 | Campaigns | `/users/user_1/campaigns/cmp_1` | User attempts to overwrite `createdAt` value during an active campaign change | `PERMISSION_DENIED` |
| T7 | Campaigns | `/users/user_1/campaigns/cmp_1` | User attempts to spoof status value to an unsupported string `malicious_status` | `PERMISSION_DENIED` |
| T8 | Orders | `/users/user_1/orders/ord_1` | User tries to execute write with transaction total amount less than 0 | `PERMISSION_DENIED` |
| T9 | Orders | `/users/victim_1/orders/ord_2` | Attacking user tries to insert a custom order under a different user profile | `PERMISSION_DENIED` |
| T10| Events | `/users/user_1/events/evt_1` | User attempts to log a delivery event status containing invalid state codes | `PERMISSION_DENIED` |
| T11| Global | `/users/{userId}` | Client tries to execute a blanket database bulk scan query without `userId` where criteria | `PERMISSION_DENIED` |
| T12| Users | `/users/user_1` | User tries to self-escalate or edit immutable profile metadata structures | `PERMISSION_DENIED` |

## 3. Threat Assessment Matrix

| Vector | Identity Spoofing | State Shortcutting | Resource Poisoning |
|--------|-------------------|--------------------|---------------------|
| users | Catch UID mismatch | Block role update | Verify ID size & regex |
| customers | Catch path mismatch | N/A | Block values < 0 |
| campaigns | Verify verified user | Validate finite transition | Limit max metrics values |
| orders | Block foreign write | N/A | Type checks on amounts |
| events | Block foreign UID | Status string enum | ID parameter validations |
