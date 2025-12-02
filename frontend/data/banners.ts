export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  link?: string;
}

export const banners: Banner[] = [
  {
    id: '1',
    title: 'Fresh Deals',
    subtitle: 'Up to 30% OFF on Fresh Vegetables',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800',
  },
  {
    id: '2',
    title: 'Premium Quality',
    subtitle: 'Best Organic Products at Your Doorstep',
    image: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800',
  },
  {
    id: '3',
    title: 'Weekend Special',
    subtitle: 'Free Delivery on Orders Above $50',
    image: 'https://images.unsplash.com/photo-1534723328310-e82dad3ee43f?w=800',
  },
];
