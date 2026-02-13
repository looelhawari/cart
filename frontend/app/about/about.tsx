import React from "react";
import { Info } from "lucide-react-native";
import Colors from "@/constants/Colors";
import StaticPageScreen from "@/components/StaticPageScreen";

// Fallback content in case API is unavailable
const FALLBACK_CONTENT = `
<h1>Welcome to ElBaraka</h1>

<h2>Who We Are</h2>
<p>ElBaraka is your trusted online hypermarket, bringing fresh groceries and daily essentials directly to your doorstep. Since our founding, we've been committed to making grocery shopping effortless and enjoyable for families across Egypt.</p>

<h2>Our Mission</h2>
<p>To revolutionize the way people shop for groceries by delivering fresh, quality products with speed and convenience, while building lasting relationships with our customers through exceptional service.</p>

<h2>Our Values</h2>
<ul>
<li><strong>Quality:</strong> We source only the finest products from trusted suppliers</li>
<li><strong>Freshness:</strong> Our cold chain ensures products arrive fresh</li>
<li><strong>Convenience:</strong> Easy ordering and fast delivery to your door</li>
<li><strong>Trust:</strong> Transparent pricing with no hidden fees</li>
<li><strong>Service:</strong> Customer satisfaction is our top priority</li>
</ul>

<h2>Why Choose Us</h2>
<p>With thousands of products, competitive prices, and delivery in as fast as 1 hour, ElBaraka makes grocery shopping simple. Our dedicated team works around the clock to ensure you receive the best shopping experience.</p>

<h2>Contact Information</h2>
<ul>
<li><strong>Email:</strong> support@elbaraka.com</li>
<li><strong>Phone:</strong> +20 123 456 7890</li>
<li><strong>Address:</strong> 123 Main Street, Cairo, Egypt</li>
</ul>

<h2>Follow Us</h2>
<p>Stay connected with us on social media for the latest updates, offers, and more!</p>

<p>© 2025 CART Hypermarket. All rights reserved.</p>
`;

export default function AboutScreen() {
  return (
    <StaticPageScreen
      slug="about"
      fallbackTitle="About ElBaraka"
      fallbackContent={FALLBACK_CONTENT}
      icon={<Info size={24} color={Colors.neutralWhite} />}
    />
  );
}
