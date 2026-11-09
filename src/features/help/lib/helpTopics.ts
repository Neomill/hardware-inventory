import {
  PauseCircle,
  ShoppingCart,
  SlidersVertical,
  Truck,
  Type,
  Wallet,
  HandCoins,
  type LucideIcon,
} from 'lucide-react'

import { ROUTES } from '@/app/routes'

/** A button name as it appears on screen, drawn like the button in the help. */
export type TapLabel = { tap: string }

/** One step: plain text with button names mixed in, e.g. ['Tap ', tap('Sell'), '.']. */
export type HelpStep = readonly (string | TapLabel)[]

export type HelpTopic = {
  id: string
  title: string
  icon: LucideIcon
  steps: readonly HelpStep[]
  /** The screen the topic starts on, offered as a button. */
  goTo: { to: string; label: string }
}

export function tap(label: string): TapLabel {
  return { tap: label }
}

/**
 * The everyday jobs at the counter, in the words the screens use
 * (docs/product/03-plain-language-labels.md). When a button is renamed, the
 * help changes with it. Senior UX plan, Phase 6.
 */
export const HELP_TOPICS: readonly HelpTopic[] = [
  {
    id: 'sell-cash',
    title: 'Sell for cash',
    icon: ShoppingCart,
    goTo: { to: ROUTES.newSale, label: 'Start a sale' },
    steps: [
      ['Tap ', tap('Sell'), ' on the home screen.'],
      [
        'Tap ',
        tap('Add 1'),
        ' on each product. For many of one product, tap ',
        tap('Choose Quantity'),
        '.',
      ],
      ['Tap ', tap('Checkout'), '.'],
      [
        'Tap the cash the customer gave you, such as ',
        tap('₱500.00'),
        ', or type it. The change shows in big green numbers.',
      ],
      ['Tap ', tap('Confirm Sale'), '. Then tap ', tap('Print Receipt'), ' if they want one.'],
    ],
  },
  {
    id: 'sell-credit',
    title: 'Sell on credit',
    icon: HandCoins,
    goTo: { to: ROUTES.newSale, label: 'Start a sale' },
    steps: [
      ['Add the products and tap ', tap('Checkout'), ', as for a cash sale.'],
      [
        'Under Payment, tap ',
        tap('Credit'),
        '. If they pay part now, tap ',
        tap('Partial Payment'),
        ' and type what they paid.',
      ],
      ['Choose the customer under Customer. Credit always needs a customer.'],
      ['Tap ', tap('Confirm Sale'), '. What they owe is added to Customer Credit.'],
    ],
  },
  {
    id: 'receive',
    title: 'Receive a delivery',
    icon: Truck,
    goTo: { to: ROUTES.receiveStock, label: 'Receive a delivery' },
    steps: [
      ['Tap ', tap('Receive Delivery'), ' on the home screen.'],
      ['Type the invoice number, supplier, date and total from the supplier’s paper.'],
      ['Search for each product, type how many came, and tap ', tap('Add to invoice'), '.'],
      ['Check the list, then tap ', tap('Receive Stock'), '.'],
    ],
  },
  {
    id: 'correct',
    title: 'Fix a wrong stock count',
    icon: SlidersVertical,
    goTo: { to: ROUTES.inventory, label: 'Open Inventory' },
    steps: [
      ['Open ', tap('Inventory'), ' and find the product.'],
      ['Tap ', tap('Correct Stock'), '.'],
      ['Tap ', tap('Remove stock'), ' or ', tap('Add stock'), ' and type how many.'],
      ['Tap a reason, such as ', tap('Counted on shelf'), ' or ', tap('Damaged'), '.'],
      ['Check “Now” and “After saving”, then tap the ', tap('Set Stock to …'), ' button.'],
    ],
  },
  {
    id: 'payment',
    title: 'See who owes, and take a payment',
    icon: Wallet,
    goTo: { to: ROUTES.customers, label: 'Open Customer Credit' },
    steps: [
      ['Tap ', tap('Who Owes Me'), ' on the home screen. The biggest balance is first.'],
      ['Tap ', tap('Record Payment'), ' next to the customer.'],
      ['Type the amount received, then tap the ', tap('Record ₱…'), ' button.'],
    ],
  },
  {
    id: 'pause',
    title: 'Pause a sale and come back to it',
    icon: PauseCircle,
    goTo: { to: ROUTES.newSale, label: 'Start a sale' },
    steps: [
      ['In the cart, tap ', tap('Pause Sale'), ' and give it a name, such as the customer’s.'],
      ['Serve the next customer as usual.'],
      ['When they come back, tap ', tap('Paused Sales'), ', then ', tap('Resume'), '.'],
    ],
  },
  {
    id: 'text-size',
    title: 'Make the text bigger',
    icon: Type,
    goTo: { to: ROUTES.settings, label: 'Open Settings' },
    steps: [
      ['Open ', tap('Settings'), '. On a tablet held upright, tap ', tap('More'), ' first.'],
      ['Under Text size, tap ', tap('Large'), ' or ', tap('Extra large'), '. It changes at once.'],
      ['Each tablet and laptop keeps its own size.'],
    ],
  },
]

/** Quick reminders for mistakes, shown under the topics. */
export const MISTAKE_TIPS: readonly HelpStep[] = [
  ['Removed the wrong item from the cart? Tap ', tap('Undo'), ' straight away.'],
  ['Every save button says what it will do, so read it before you tap.'],
  ['Nothing is lost if you leave a screen: the cart stays until you check out or clear it.'],
]
