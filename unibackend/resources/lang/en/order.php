<?php

return [
    // Rate limiting
    'wait_before_cancel' => 'Please wait :seconds seconds before trying to cancel again.',

    // Order status checks
    'already_cancelling' => 'This order is already being cancelled. Please wait.',
    'already_cancelled_or_failed' => 'This order has already been cancelled or failed.',
    'cannot_cancel_delivered' => 'Cannot cancel a delivered order. Use the return/refund process instead.',
    'cannot_cancel_out_for_delivery' => 'Cannot cancel an order that is out for delivery.',

    // Partial refund
    'partial_refund_status_error' => 'You can only request a partial refund for confirmed, preparing, or delivered orders.',
    'partial_refund_card_only' => 'Partial refunds are only available for card-paid orders.',
    'no_payment_found' => 'No successful payment found for this order.',
    'no_valid_items' => 'No valid items found to refund. Items may already be refunded.',
    'refund_exceeds_remaining' => 'Refund amount (:amount) exceeds remaining refundable amount (:remaining).',
    'refund_already_processed' => 'This refund has already been processed.',
    'partial_refund_success' => 'Partial refund of :amount :currency processed successfully.',

    // Item cancellation (COD)
    'items_cancelled_success' => 'Items cancelled successfully. :amount :currency removed from your order.',

    // Full order cancellation
    'no_payment_no_refund' => 'Order cancelled. No payment was completed, so no refund is needed.',
    'refund_already_done' => 'Order cancelled. A refund was already processed for this order.',
    'refund_already_processed_cancel' => 'Order cancelled. The refund was already processed.',
    'cod_cancelled_no_refund' => 'Order cancelled successfully. No refund is needed for cash on delivery orders.',

    // Refund processing
    'full_refund_success' => 'Order cancelled. Full refund of :amount :currency will be returned to your card within 3-5 business days.',
    'penalty_refund_success' => 'Order cancelled. Refund of :amount :currency (after :penalty% penalty) will be returned to your card within 3-5 business days.',

    // Error messages
    'order_not_found' => 'Order not found or does not belong to you',
    'auth_required' => 'Authentication required',
    'system_error' => 'A system error occurred while processing your cancellation. Please try again or contact support.',
    'unexpected_error' => 'An unexpected error occurred. Please try again or contact support.',

    // Cancellation eligibility
    'can_cancel' => 'This order can be cancelled.',
    'cannot_cancel' => 'This order cannot be cancelled.',
    'cancel_with_penalty' => 'Cancellation will incur a :percent% penalty fee.',
    'estimated_days' => '5-14 business days',

    // Controller messages
    'validation_failed' => 'Validation failed',
    'auth_required_login' => 'Authentication required. Please login to place an order.',
    'cart_empty' => 'Cart is empty',
    'order_placed' => 'Order placed successfully',
    'order_not_found_short' => 'Order not found',
    'failed_retrieve_orders' => 'Failed to retrieve orders',
    'failed_retrieve_order' => 'Failed to retrieve order',
    'failed_retrieve_tracking' => 'Failed to retrieve tracking data',
    'cancelled_by_user' => 'Cancelled by user',
    'failed_cancel_check' => 'Failed to check cancellation eligibility. Please try again.',
    'failed_refund_history' => 'Failed to retrieve refund history. Please try again.',
    'items_added_to_cart' => 'Items added to cart',
    'failed_reorder' => 'Failed to reorder',
    'no_email_on_account' => 'No email address on your account. Please add one in your profile.',
    'unable_generate_invoice_pdf' => 'Unable to generate invoice PDF. Please try again later.',
    'invoice_sent_to' => 'Invoice sent to :email',
    'failed_send_invoice' => 'Failed to send invoice email. Please try again.',
    'failed_generate_invoice_data' => 'Failed to generate invoice data.',
    'failed_generate_invoice' => 'Failed to generate invoice.',
];
