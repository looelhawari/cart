export const user = {
  id: '1',
  name: 'Ahmed Hassan',
  email: 'ahmed.hassan@email.com',
  phone: '+20 123 456 7890',
  avatar: 'https://i.pravatar.cc/150?img=12',
  dateOfBirth: '1990-05-15',
  gender: 'male' as const,
  registrationDate: '2023-06-10',
  totalOrders: 24,
  lifetimeValue: 1248.50,
};

export interface PaymentMethod {
  id: string;
  type: 'card' | 'cod';
  cardLastFour?: string;
  cardBrand?: 'visa' | 'mastercard';
  expiryMonth?: string;
  expiryYear?: string;
  isDefault: boolean;
}

export const paymentMethods: PaymentMethod[] = [
  {
    id: '1',
    type: 'card',
    cardLastFour: '1234',
    cardBrand: 'visa',
    expiryMonth: '12',
    expiryYear: '25',
    isDefault: true,
  },
  {
    id: '2',
    type: 'card',
    cardLastFour: '5678',
    cardBrand: 'mastercard',
    expiryMonth: '08',
    expiryYear: '26',
    isDefault: false,
  },
];

export interface Notification {
  id: string;
  type: 'order' | 'offer' | 'account' | 'system';
  title: string;
  message: string;
  date: string;
  isRead: boolean;
  actionUrl?: string;
}

export const notifications: Notification[] = [
  {
    id: '1',
    type: 'order',
    title: 'Order Delivered!',
    message: 'Your order #EB-2024-001 has been delivered successfully.',
    date: '2024-01-15T16:30:00Z',
    isRead: true,
    actionUrl: '/orders/1',
  },
  {
    id: '2',
    type: 'order',
    title: 'Out for Delivery',
    message: 'Your order #EB-2024-002 is out for delivery and will arrive soon.',
    date: '2024-01-20T15:00:00Z',
    isRead: false,
    actionUrl: '/orders/2',
  },
  {
    id: '3',
    type: 'offer',
    title: 'Flash Sale!',
    message: 'Get up to 50% off on selected items. Limited time only!',
    date: '2024-01-21T08:00:00Z',
    isRead: false,
    actionUrl: '/offers',
  },
  {
    id: '4',
    type: 'account',
    title: 'Profile Updated',
    message: 'Your profile information has been updated successfully.',
    date: '2024-01-19T12:00:00Z',
    isRead: true,
  },
];

export interface Complaint {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: 'order' | 'product' | 'delivery' | 'payment' | 'technical' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'awaiting_response' | 'resolved' | 'closed';
  orderId?: string;
  createdAt: string;
  updatedAt: string;
  messages: ComplaintMessage[];
  rating?: number;
}

export interface ComplaintMessage {
  id: string;
  text: string;
  isAdminReply: boolean;
  sender: string;
  timestamp: string;
}

export const complaints: Complaint[] = [
  {
    id: '1',
    ticketNumber: 'TKT-2024-001',
    subject: 'Missing item in order',
    description: 'I received my order but one item was missing from the delivery.',
    category: 'order',
    priority: 'high',
    status: 'resolved',
    orderId: '1',
    createdAt: '2024-01-16T10:00:00Z',
    updatedAt: '2024-01-17T14:30:00Z',
    messages: [
      {
        id: '1',
        text: 'I received my order but the Greek Yogurt was missing.',
        isAdminReply: false,
        sender: 'Ahmed Hassan',
        timestamp: '2024-01-16T10:00:00Z',
      },
      {
        id: '2',
        text: 'We apologize for the inconvenience. We have issued a refund for the missing item.',
        isAdminReply: true,
        sender: 'Support Team',
        timestamp: '2024-01-17T14:30:00Z',
      },
    ],
    rating: 5,
  },
  {
    id: '2',
    ticketNumber: 'TKT-2024-002',
    subject: 'Delivery delay',
    description: 'My order was delivered 2 hours late.',
    category: 'delivery',
    priority: 'medium',
    status: 'closed',
    orderId: '2',
    createdAt: '2024-01-18T16:00:00Z',
    updatedAt: '2024-01-19T09:00:00Z',
    messages: [
      {
        id: '1',
        text: 'My order was supposed to arrive at 2 PM but came at 4 PM.',
        isAdminReply: false,
        sender: 'Ahmed Hassan',
        timestamp: '2024-01-18T16:00:00Z',
      },
      {
        id: '2',
        text: 'We sincerely apologize for the delay. We have added credit to your account.',
        isAdminReply: true,
        sender: 'Support Team',
        timestamp: '2024-01-19T09:00:00Z',
      },
    ],
    rating: 4,
  },
];

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: 'orders' | 'payments' | 'products' | 'account' | 'delivery';
}

export const faqs: FAQ[] = [
  {
    id: '1',
    question: 'How can I track my order?',
    answer: 'You can track your order by going to the Orders tab and selecting your active order. You will see real-time updates on your delivery status.',
    category: 'orders',
  },
  {
    id: '2',
    question: 'What payment methods do you accept?',
    answer: 'We accept Visa, Mastercard credit/debit cards, and Cash on Delivery (COD).',
    category: 'payments',
  },
  {
    id: '3',
    question: 'How do I cancel an order?',
    answer: 'You can cancel an order from the Order Details page before it enters the "Preparing" status. After that, please contact our support team.',
    category: 'orders',
  },
  {
    id: '4',
    question: 'Are the products fresh?',
    answer: 'Yes! We source all our products daily from trusted suppliers and ensure they meet our quality standards before delivery.',
    category: 'products',
  },
  {
    id: '5',
    question: 'What is your return policy?',
    answer: 'We offer a full refund or replacement for damaged or incorrect items. Please contact us within 24 hours of delivery.',
    category: 'orders',
  },
  {
    id: '6',
    question: 'How much is the delivery fee?',
    answer: 'Standard delivery fee is $2.99. Orders above $50 qualify for free delivery.',
    category: 'delivery',
  },
];
