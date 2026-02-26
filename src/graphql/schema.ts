// import { gql } from 'graphql-tag';

// export const typeDefs = gql`
export const typeDefs = `#graphql
  scalar DateTime

  enum TransactionType { credit, debit }

  enum SortOrder { asc, desc }
  
  enum TransactionSortField {
    type
    datetime
    amount
    note
    createdAt
  }

  interface MutationResponse {
    success: Boolean!
    message: String
  }
  
  # INPUTS
  input CreateTransactionInput {
    amount: Float!
    datetime: DateTime!
    type: TransactionType!
    note: String
  }

  input UpdateTransactionInput {
    txnId: ID!
    amount: Float
    datetime: DateTime
    type: TransactionType!
    note: String
  }

  input UpdateProfileInput {
    firstname: String!
    lastname: String
  }

  # MODELS
  type User {
    id: ID!
    email: String!
    firstname: String!
    lastname: String
    fullname: String
    createdAt: DateTime!
  }

  type Transaction {
    id: ID!
    amount: Float!
    datetime: DateTime!
    type: TransactionType!
    note: String
    userId: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # RESPONSES
  type UpdateProfileResponse implements MutationResponse {
    success: Boolean!
    message: String
    user: User
  }

  type TransactionsResult {
    totalCount: Int!
    transactions: [Transaction!]!
  }

  type CreateTxnsResponse implements MutationResponse {
    success: Boolean!
    message: String
    insertCount: Int
  }

  type UpdateTxnResponse implements MutationResponse {
    success: Boolean!
    message: String
    transaction: Transaction
  }

  type DeleteTxnResponse implements MutationResponse {
    success: Boolean!
    message: String
    deleted: Boolean
  }

  type Query {
    profile: User
    transactions(
      page: Int! = 1,
      pageSize: Int! = 10,
      sortBy: TransactionSortField = datetime,
      sortOrder: SortOrder = desc
    ): TransactionsResult!
  }

  type Mutation {
    updateProfile(input: UpdateProfileInput!): UpdateProfileResponse!
    createTransactions(input: [CreateTransactionInput!]!): CreateTxnsResponse!
    updateTransaction(input: UpdateTransactionInput!): UpdateTxnResponse!
    deleteTransaction(id: ID!): DeleteTxnResponse!
  }
`;