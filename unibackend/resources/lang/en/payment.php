<?php

return [
    // Pre-check
    'validation_failed' => 'Validation failed',
    'pre_check_successful' => 'Payment pre-check successful. Proceed to order summary.',
    'service_unavailable' => 'Payment service temporarily unavailable. Please try again or choose Cash on Delivery.',

    // Initiate
    'unauthorized_order' => 'Unauthorized: Order does not belong to you',
    'already_paid' => 'Order already paid',
    'processing_saved_card' => 'Payment processing with saved card',
    'initiate_failed' => 'Failed to initiate payment. Please try again.',

    // Status
    'successful' => 'Payment successful',
    'failed' => 'Payment failed',
    'not_found_for_order' => 'No payment found for this order',
    'status_fetch_failed' => 'Failed to get payment status',
    'not_found' => 'Payment not found',
    'status_retrieve_failed' => 'Failed to retrieve payment status',

    // Saved card
    'unauthorized_access' => 'Unauthorized access to order',
    'unauthorized_payment_method' => 'Unauthorized access to payment method',
    'method_deleted' => 'Payment method has been deleted',
    'method_token_invalid' => 'Payment method token is invalid',
    'card_expired' => 'Card has expired',
    'moto_3ds_redirect' => 'MOTO requires 3DS - redirecting to checkout',
    'unauthorized_payment_status' => 'Unauthorized access to payment status',

    // Payment methods
    'methods_fetch_failed' => 'Failed to retrieve payment methods',
    'method_not_found' => 'Payment method not found',
    'unauthorized_action' => 'Unauthorized action',
    'cannot_set_expired_default' => 'Cannot set expired card as default',
    'default_updated' => 'Default payment method updated successfully',
    'default_update_failed' => 'Failed to update default payment method',
    'method_deleted_success' => 'Payment method deleted successfully',
    'method_delete_failed' => 'Failed to delete payment method',
];
