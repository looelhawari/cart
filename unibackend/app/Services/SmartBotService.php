<?php

namespace App\Services;

use App\Models\BotResponse;
use App\Models\BotConversationContext;
use App\Models\Complaint;
use App\Models\ComplaintMessage;
use App\Models\Order;
use App\Models\User;
use App\Events\ComplaintMessageSent;

class SmartBotService
{
    // Intent constants
    public const INTENT_GREETING = 'greeting';
    public const INTENT_ORDER_STATUS = 'order_status';
    public const INTENT_TRACK_ORDER = 'track_order';
    public const INTENT_REFUND = 'refund';
    public const INTENT_DELIVERY = 'delivery';
    public const INTENT_PAYMENT = 'payment';
    public const INTENT_PRODUCT_ISSUE = 'product_issue';
    public const INTENT_CANCEL_ORDER = 'cancel_order';
    public const INTENT_CHANGE_ADDRESS = 'change_address';
    public const INTENT_PROMO_CODE = 'promo_code';
    public const INTENT_WORKING_HOURS = 'working_hours';
    public const INTENT_CONTACT = 'contact';
    public const INTENT_ESCALATE = 'escalate';
    public const INTENT_THANKS = 'thanks';
    public const INTENT_GOODBYE = 'goodbye';
    public const INTENT_UNKNOWN = 'unknown';

    // Keywords for intent detection
    private array $intentKeywords = [
        self::INTENT_GREETING => ['hello', 'hi', 'hey', 'good morning', 'good evening', 'مرحبا', 'اهلا', 'السلام عليكم'],
        self::INTENT_ORDER_STATUS => ['order status', 'where is my order', 'my order', 'order update', 'حالة الطلب', 'فين الطلب', 'طلبي'],
        self::INTENT_TRACK_ORDER => ['track', 'tracking', 'where is', 'delivery status', 'تتبع', 'فين', 'موقع الطلب'],
        self::INTENT_REFUND => ['refund', 'money back', 'return money', 'get refund', 'استرداد', 'فلوس', 'ترجيع'],
        self::INTENT_DELIVERY => ['delivery', 'deliver', 'shipping', 'arrive', 'توصيل', 'شحن', 'وصول'],
        self::INTENT_PAYMENT => ['payment', 'pay', 'charge', 'card', 'visa', 'دفع', 'بطاقة', 'فيزا'],
        self::INTENT_PRODUCT_ISSUE => ['damaged', 'broken', 'wrong product', 'bad quality', 'expired', 'تالف', 'مكسور', 'غلط', 'منتهي'],
        self::INTENT_CANCEL_ORDER => ['cancel', 'cancellation', 'stop order', 'الغاء', 'الغي'],
        self::INTENT_CHANGE_ADDRESS => ['change address', 'update address', 'wrong address', 'تغيير العنوان', 'عنوان غلط'],
        self::INTENT_PROMO_CODE => ['promo', 'coupon', 'discount', 'offer', 'كود', 'خصم', 'عرض'],
        self::INTENT_WORKING_HOURS => ['working hours', 'open', 'close', 'time', 'مواعيد', 'فتح', 'اغلاق'],
        self::INTENT_CONTACT => ['contact', 'phone', 'call', 'email', 'تواصل', 'تليفون', 'ايميل'],
        self::INTENT_ESCALATE => ['agent', 'human', 'person', 'real person', 'representative', 'support', 'موظف', 'حد يساعدني', 'خدمة عملاء'],
        self::INTENT_THANKS => ['thank', 'thanks', 'appreciate', 'شكرا', 'متشكر'],
        self::INTENT_GOODBYE => ['bye', 'goodbye', 'see you', 'مع السلامة', 'باي'],
    ];

    // Bot responses (built-in fallbacks)
    private array $defaultResponses = [
        'en' => [
            self::INTENT_GREETING => "Hello! 👋 Welcome to ElBaraka Support! I'm your virtual assistant and I'm here to help you.\n\nHow can I assist you today?\n\n• 📦 Track your order\n• 💳 Payment issues\n• 🚚 Delivery questions\n• 📞 Talk to an agent",
            self::INTENT_ORDER_STATUS => "I'd be happy to help you with your order status! 📦\n\nCould you please tell me your order number? You can find it in your order confirmation email or in the \"My Orders\" section of the app.",
            self::INTENT_TRACK_ORDER => "Let me help you track your order! 🔍\n\nPlease provide your order number and I'll get the latest status for you.",
            self::INTENT_REFUND => "I understand you'd like a refund. 💰\n\nRefund requests are typically processed within 3-5 business days. To proceed, I'll need:\n\n1. Your order number\n2. The reason for the refund\n\nOr I can connect you with an agent who can help faster.",
            self::INTENT_DELIVERY => "I'll help you with your delivery question! 🚚\n\n• Standard delivery: 1-3 business days\n• Express delivery: Same day (if ordered before 2 PM)\n• Free delivery on orders over 200 EGP\n\nIs there anything specific about your delivery you'd like to know?",
            self::INTENT_PAYMENT => "I can help with payment questions! 💳\n\nWe accept:\n• Visa & Mastercard\n• Cash on Delivery\n\nIf you're having a payment issue, please tell me more or I can connect you with our support team.",
            self::INTENT_PRODUCT_ISSUE => "I'm sorry to hear about the product issue! 😔\n\nWe take quality very seriously. To help you:\n\n1. Please describe the issue\n2. Take photos if possible\n\nWould you like me to connect you with an agent to resolve this quickly?",
            self::INTENT_CANCEL_ORDER => "I can help you cancel your order! ❌\n\n⚠️ Please note:\n• Orders can only be cancelled before they're shipped\n• Refunds are processed within 3-5 business days\n\nPlease provide your order number to proceed.",
            self::INTENT_CHANGE_ADDRESS => "Let me help you update your delivery address! 📍\n\nPlease note that address changes can only be made if your order hasn't been shipped yet.\n\nWould you like me to connect you with an agent to make this change?",
            self::INTENT_PROMO_CODE => "Looking for deals? 🎉\n\nYou can find available promo codes in:\n• The \"Promotions\" section of the app\n• Our SMS/Email notifications\n• Our social media pages\n\nTo apply a code, enter it at checkout!",
            self::INTENT_WORKING_HOURS => "Our working hours ⏰\n\n🏪 Store Hours:\n• Daily: 8:00 AM - 12:00 AM\n\n📞 Customer Support:\n• Daily: 9:00 AM - 11:00 PM\n\nNeed anything else?",
            self::INTENT_CONTACT => "Here's how to reach us 📞\n\n• 📱 Phone: 16XXX\n• 📧 Email: support@elbaraka.com\n• 💬 This chat (available 24/7)\n\nWould you like to speak with an agent now?",
            self::INTENT_ESCALATE => "I'll connect you with a support agent right away! 🎧\n\nAn agent will respond to your message shortly. Our average response time is under 5 minutes during working hours.\n\nPlease describe your issue and an agent will help you.",
            self::INTENT_THANKS => "You're welcome! 😊 I'm glad I could help.\n\nIs there anything else you'd like to know?",
            self::INTENT_GOODBYE => "Thank you for contacting ElBaraka! 👋\n\nHave a great day! Don't forget to rate your experience if you found our service helpful. 🌟",
            self::INTENT_UNKNOWN => "I'm not sure I understood that correctly. 🤔\n\nHere's what I can help you with:\n• 📦 Order status & tracking\n• 💳 Payment issues\n• 🚚 Delivery questions\n• 🔄 Refunds & returns\n\nOr type \"agent\" to speak with a human.",
        ],
        'ar' => [
            self::INTENT_GREETING => "أهلاً! 👋 مرحباً بك في دعم البركة! أنا مساعدك الافتراضي وأنا هنا لمساعدتك.\n\nكيف يمكنني مساعدتك اليوم؟\n\n• 📦 تتبع طلبك\n• 💳 مشاكل الدفع\n• 🚚 أسئلة التوصيل\n• 📞 التحدث مع موظف",
            self::INTENT_ORDER_STATUS => "يسعدني مساعدتك في حالة طلبك! 📦\n\nهل يمكنك إخباري برقم الطلب؟ يمكنك العثور عليه في إيميل تأكيد الطلب أو في قسم \"طلباتي\" في التطبيق.",
            self::INTENT_TRACK_ORDER => "دعني أساعدك في تتبع طلبك! 🔍\n\nيرجى تزويدي برقم الطلب وسأحصل على آخر حالة لك.",
            self::INTENT_REFUND => "أفهم أنك تريد استرداد المبلغ. 💰\n\nعادة ما يتم معالجة طلبات الاسترداد خلال 3-5 أيام عمل. للمتابعة، سأحتاج إلى:\n\n1. رقم طلبك\n2. سبب الاسترداد\n\nأو يمكنني توصيلك بموظف يمكنه المساعدة بشكل أسرع.",
            self::INTENT_DELIVERY => "سأساعدك في سؤالك عن التوصيل! 🚚\n\n• التوصيل العادي: 1-3 أيام عمل\n• التوصيل السريع: نفس اليوم (إذا طلبت قبل 2 مساءً)\n• توصيل مجاني للطلبات فوق 200 جنيه\n\nهل هناك شيء محدد عن توصيلك تود معرفته؟",
            self::INTENT_PAYMENT => "يمكنني المساعدة في أسئلة الدفع! 💳\n\nنقبل:\n• فيزا وماستركارد\n• الدفع عند الاستلام\n\nإذا كانت لديك مشكلة في الدفع، يرجى إخباري المزيد أو يمكنني توصيلك بفريق الدعم.",
            self::INTENT_PRODUCT_ISSUE => "أنا آسف لسماع مشكلة المنتج! 😔\n\nنحن نأخذ الجودة على محمل الجد. لمساعدتك:\n\n1. يرجى وصف المشكلة\n2. التقاط صور إن أمكن\n\nهل تريد أن أوصلك بموظف لحل هذا بسرعة؟",
            self::INTENT_CANCEL_ORDER => "يمكنني مساعدتك في إلغاء طلبك! ❌\n\n⚠️ يرجى ملاحظة:\n• يمكن إلغاء الطلبات فقط قبل شحنها\n• يتم معالجة المبالغ المستردة خلال 3-5 أيام عمل\n\nيرجى تزويدي برقم الطلب للمتابعة.",
            self::INTENT_CHANGE_ADDRESS => "دعني أساعدك في تحديث عنوان التوصيل! 📍\n\nيرجى ملاحظة أنه يمكن تغيير العنوان فقط إذا لم يتم شحن طلبك بعد.\n\nهل تريد أن أوصلك بموظف لإجراء هذا التغيير؟",
            self::INTENT_PROMO_CODE => "تبحث عن عروض؟ 🎉\n\nيمكنك العثور على أكواد الخصم المتاحة في:\n• قسم \"العروض\" في التطبيق\n• إشعارات الرسائل القصيرة/البريد الإلكتروني\n• صفحاتنا على وسائل التواصل الاجتماعي\n\nلتطبيق الكود، أدخله عند الدفع!",
            self::INTENT_WORKING_HOURS => "ساعات العمل ⏰\n\n🏪 ساعات المتجر:\n• يومياً: 8:00 صباحاً - 12:00 منتصف الليل\n\n📞 دعم العملاء:\n• يومياً: 9:00 صباحاً - 11:00 مساءً\n\nهل تحتاج أي شيء آخر؟",
            self::INTENT_CONTACT => "إليك كيفية الوصول إلينا 📞\n\n• 📱 الهاتف: 16XXX\n• 📧 البريد الإلكتروني: support@elbaraka.com\n• 💬 هذه المحادثة (متاحة 24/7)\n\nهل تريد التحدث مع موظف الآن؟",
            self::INTENT_ESCALATE => "سأوصلك بموظف دعم فوراً! 🎧\n\nسيرد موظف على رسالتك قريباً. متوسط وقت الرد لدينا أقل من 5 دقائق خلال ساعات العمل.\n\nيرجى وصف مشكلتك وسيساعدك موظف.",
            self::INTENT_THANKS => "على الرحب والسعة! 😊 أنا سعيد أنني استطعت المساعدة.\n\nهل هناك أي شيء آخر تود معرفته؟",
            self::INTENT_GOODBYE => "شكراً لتواصلك مع البركة! 👋\n\nيوماً سعيداً! لا تنسى تقييم تجربتك إذا وجدت خدمتنا مفيدة. 🌟",
            self::INTENT_UNKNOWN => "لست متأكداً أنني فهمت ذلك بشكل صحيح. 🤔\n\nإليك ما يمكنني مساعدتك فيه:\n• 📦 حالة الطلب والتتبع\n• 💳 مشاكل الدفع\n• 🚚 أسئلة التوصيل\n• 🔄 الاسترداد والإرجاع\n\nأو اكتب \"موظف\" للتحدث مع إنسان.",
        ],
    ];

    // Maximum bot messages before suggesting escalation
    private const MAX_BOT_MESSAGES = 5;

    /**
     * Process incoming message and generate bot response
     */
    public function processMessage(Complaint $complaint, string $userMessage, string $lang = 'en'): array
    {
        // Get or create conversation context
        $context = BotConversationContext::getOrCreate($complaint->id);
        $context->increment('message_count');

        // Detect intent from message
        $intent = $this->detectIntent($userMessage, $context);
        
        // Check if should escalate
        $shouldEscalate = $this->shouldEscalate($intent, $context, $complaint);
        
        if ($shouldEscalate) {
            return $this->escalateToAgent($complaint, $context, $lang);
        }

        // Update context with detected intent
        $context->updateContext($intent);

        // Generate response
        $response = $this->generateResponse($intent, $complaint, $context, $lang);

        // Check for special actions
        $action = $this->getAction($intent, $complaint, $context);

        // Create bot message
        $botMessage = $this->createBotMessage($complaint, $response, $intent);

        return [
            'success' => true,
            'message' => $botMessage,
            'intent' => $intent,
            'action' => $action,
            'escalated' => false,
            'context' => [
                'message_count' => $context->message_count,
                'current_intent' => $context->current_intent,
            ],
        ];
    }

    /**
     * Detect intent from user message
     */
    private function detectIntent(string $message, BotConversationContext $context): string
    {
        $message = strtolower(trim($message));
        
        // Check for exact escalation requests first
        foreach ($this->intentKeywords[self::INTENT_ESCALATE] as $keyword) {
            if (str_contains($message, strtolower($keyword))) {
                return self::INTENT_ESCALATE;
            }
        }

        // Check other intents
        foreach ($this->intentKeywords as $intent => $keywords) {
            foreach ($keywords as $keyword) {
                if (str_contains($message, strtolower($keyword))) {
                    return $intent;
                }
            }
        }

        // Try database responses
        $dbResponse = BotResponse::findMatch($message);
        if ($dbResponse) {
            return $dbResponse->intent;
        }

        return self::INTENT_UNKNOWN;
    }

    /**
     * Check if we should escalate to human agent
     */
    private function shouldEscalate(string $intent, BotConversationContext $context, Complaint $complaint): bool
    {
        // Already escalated
        if ($complaint->escalated_to_agent) {
            return false;
        }

        // Explicit escalation request
        if ($intent === self::INTENT_ESCALATE) {
            return true;
        }

        // Too many bot messages
        if ($context->message_count >= self::MAX_BOT_MESSAGES) {
            return true;
        }

        // Multiple unknown intents in a row
        $recentUnknowns = $this->countRecentUnknowns($complaint->id);
        if ($recentUnknowns >= 2) {
            return true;
        }

        // Complex issues that need human
        $complexCategories = ['product_quality', 'payment_issue'];
        if (in_array($complaint->category, $complexCategories) && $context->message_count > 2) {
            return true;
        }

        return false;
    }

    /**
     * Count recent unknown intent messages
     */
    private function countRecentUnknowns(int $complaintId): int
    {
        return ComplaintMessage::where('complaint_id', $complaintId)
            ->where('is_bot_reply', true)
            ->where('bot_intent', self::INTENT_UNKNOWN)
            ->where('created_at', '>=', now()->subMinutes(10))
            ->count();
    }

    /**
     * Escalate to human agent
     */
    private function escalateToAgent(Complaint $complaint, BotConversationContext $context, string $lang): array
    {
        $complaint->update([
            'escalated_to_agent' => true,
            'escalated_at' => now(),
            'escalation_reason' => $this->getEscalationReason($context),
            'status' => 'awaiting_response',
        ]);

        $escalationMessage = $lang === 'ar' 
            ? "تم تحويلك إلى موظف دعم! 🎧\n\nسيرد عليك أحد موظفينا قريباً. شكراً لصبرك."
            : "You've been connected to a support agent! 🎧\n\nOne of our team members will respond shortly. Thank you for your patience.";

        $botMessage = $this->createBotMessage($complaint, $escalationMessage, self::INTENT_ESCALATE);

        return [
            'success' => true,
            'message' => $botMessage,
            'intent' => self::INTENT_ESCALATE,
            'action' => 'escalated',
            'escalated' => true,
            'context' => [
                'message_count' => $context->message_count,
                'current_intent' => self::INTENT_ESCALATE,
            ],
        ];
    }

    /**
     * Get escalation reason
     */
    private function getEscalationReason(BotConversationContext $context): string
    {
        if ($context->message_count >= self::MAX_BOT_MESSAGES) {
            return 'Max bot messages reached';
        }
        return 'User requested agent';
    }

    /**
     * Generate response for intent
     */
    private function generateResponse(string $intent, Complaint $complaint, BotConversationContext $context, string $lang): string
    {
        // Try database first
        $dbResponse = BotResponse::where('intent', $intent)
            ->where('is_active', true)
            ->where(function ($q) use ($complaint) {
                $q->where('category', $complaint->category)
                  ->orWhereNull('category');
            })
            ->orderByDesc('priority')
            ->first();

        if ($dbResponse) {
            return $dbResponse->getResponse($lang);
        }

        // Use default response
        return $this->defaultResponses[$lang][$intent] ?? $this->defaultResponses[$lang][self::INTENT_UNKNOWN];
    }

    /**
     * Get action for intent
     */
    private function getAction(string $intent, Complaint $complaint, BotConversationContext $context): ?array
    {
        switch ($intent) {
            case self::INTENT_ORDER_STATUS:
            case self::INTENT_TRACK_ORDER:
                if ($complaint->order_id) {
                    $order = Order::find($complaint->order_id);
                    if ($order) {
                        return [
                            'type' => 'show_order',
                            'data' => [
                                'order_id' => $order->id,
                                'order_number' => $order->order_number,
                                'status' => $order->status,
                            ],
                        ];
                    }
                }
                return ['type' => 'request_order_id'];

            case self::INTENT_ESCALATE:
                return ['type' => 'escalated'];

            default:
                return null;
        }
    }

    /**
     * Create bot message in database
     */
    private function createBotMessage(Complaint $complaint, string $message, string $intent): ComplaintMessage
    {
        $botMessage = ComplaintMessage::create([
            'complaint_id' => $complaint->id,
            'user_id' => $complaint->user_id, // Use complaint owner's ID for bot messages
            'message' => $message,
            'is_admin_reply' => true,
            'is_bot_reply' => true,
            'bot_intent' => $intent,
        ]);

        // Broadcast the message
        broadcast(new ComplaintMessageSent($botMessage))->toOthers();

        return $botMessage;
    }

    /**
     * Get initial welcome message for new complaint
     */
    public function getWelcomeMessage(Complaint $complaint, string $lang = 'en'): ComplaintMessage
    {
        $context = BotConversationContext::getOrCreate($complaint->id);
        
        $welcomeMessages = [
            'en' => "Hello! 👋 I'm your ElBaraka support assistant.\n\nI can see you've submitted a ticket about: **{$complaint->subject}**\n\nI'll try to help you resolve this quickly. If I can't solve your issue, I'll connect you with one of our support agents.\n\nHow can I assist you?",
            'ar' => "مرحباً! 👋 أنا مساعد دعم البركة.\n\nأرى أنك قدمت تذكرة بخصوص: **{$complaint->subject}**\n\nسأحاول مساعدتك في حل هذا بسرعة. إذا لم أتمكن من حل مشكلتك، سأوصلك بأحد موظفي الدعم لدينا.\n\nكيف يمكنني مساعدتك؟",
        ];

        return $this->createBotMessage($complaint, $welcomeMessages[$lang], self::INTENT_GREETING);
    }

    /**
     * Check if complaint is bot-handled or escalated
     */
    public function isBotHandled(Complaint $complaint): bool
    {
        return $complaint->bot_handled && !$complaint->escalated_to_agent;
    }
}
