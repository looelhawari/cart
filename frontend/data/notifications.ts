import { Notification } from '@/types';

export const notifications: Notification[] = [
  {
    id: '1',
    type: 'order',
    title: 'Order Delivered',
    message: 'Your order #ORD-12345 has been delivered successfully',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    isRead: false,
  },
  {
    id: '2',
    type: 'offer',
    title: 'Flash Sale Alert!',
    message: 'Get 50% off on all dairy products. Limited time only!',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    isRead: false,
  },
  {
    id: '3',
    type: 'order',
    title: 'Order Out for Delivery',
    message: 'Your order #ORD-12344 is out for delivery',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    isRead: true,
  },
  {
    id: '4',
    type: 'account',
    title: 'Profile Updated',
    message: 'Your profile information has been updated successfully',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    isRead: true,
  },
  {
    id: '5',
    type: 'offer',
    title: 'Weekend Special',
    message: 'Fresh vegetables at 30% off this weekend only',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    isRead: true,
  },
  {
    id: '6',
    type: 'order',
    title: 'Order Confirmed',
    message: 'Your order #ORD-12343 has been confirmed',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    isRead: true,
  },
];
