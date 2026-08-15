# Information Architecture

---

# Purpose

This document defines the application's navigation structure and the relationship between screens.

The MVP is designed for a **single hardware store**, **single cashier**, and **tablet-first** operation.

The navigation should remain simple and require minimal training.

---

# Navigation Structure

Dashboard
│
├── Products
│ ├── Product List
│ ├── Product Details
│ └── Search Products
│
├── Sales (POS)
│ ├── Product Search
│ ├── Shopping Cart
│ ├── Checkout
│ └── Sale Complete
│
├── Inventory
│ ├── Current Inventory
│ ├── Receive Stock
│ ├── Inventory Transactions
│ └── Product Stock Details
│
├── Customer Ledger
│ ├── Customer List
│ ├── Customer Details
│ ├── Outstanding Balances
│ ├── Payment History
│ └── Record Payment
│
└── Settings (Prototype)

# Navigation Items

Dashboard
Products
Sales
Inventory
Ledger

# Dashboard

Purpose

Give the owner a quick overview of the business.

## Widgets

Today's Sales

Outstanding Credit

Low Stock

Recent Sales

Recent Inventory Transactions

## Actions

View Products

Open POS

Receive Stock

View Ledger

## Products

Purpose

Allow fast product lookup.
