import React from "react";
import { Info } from "lucide-react-native";
import Colors from "@/constants/Colors";
import StaticPageScreen from "@/components/StaticPageScreen";

// Fallback content in case API is unavailable
const FALLBACK_CONTENT = `
<h1>Welcome to CART</h1>

<p><strong>Cart is operated by Al Baraka Market.</strong></p>

<h2>Who We Are</h2>
<p>CART is your trusted online hypermarket, bringing fresh groceries and daily essentials directly to your doorstep. Since our founding, we've been committed to making grocery shopping effortless and enjoyable for families across Egypt.</p>

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
<p>With thousands of products, competitive prices, and delivery in as fast as 1 hour, CART makes grocery shopping simple. Our dedicated team works around the clock to ensure you receive the best shopping experience.</p>

<h2>Contact Information</h2>
<ul>
<li><strong>Email:</strong> Cart.shopegy@gmail.com</li>
<li><strong>In-App:</strong> Profile → Help & Support → Contact Support</li>
</ul>

<h2>Follow Us</h2>
<p>Stay connected with us on social media for the latest updates, offers, and more!</p>

<p>© 2026 CART. All rights reserved.</p>
`;

const FALLBACK_CONTENT_AR = `
<h1>مرحبًا بكم في CART</h1>

<p><strong>تطبيق Cart يُدار بواسطة Al Baraka Market.</strong></p>

<h2>من نحن</h2>
<p>CART هو هايبر ماركت إلكتروني موثوق، يقدم البقالة الطازجة والمستلزمات اليومية مباشرة إلى باب منزلك. منذ تأسيسنا، نلتزم بجعل تسوق البقالة سهلًا وممتعًا للعائلات في جميع أنحاء مصر.</p>

<h2>مهمتنا</h2>
<p>إحداث ثورة في طريقة تسوق البقالة من خلال توصيل منتجات طازجة وعالية الجودة بسرعة وراحة، مع بناء علاقات دائمة مع عملائنا من خلال خدمة استثنائية.</p>

<h2>قيمنا</h2>
<ul>
<li><strong>الجودة:</strong> نحصل فقط على أفضل المنتجات من موردين موثوقين</li>
<li><strong>الطزاجة:</strong> سلسلة التبريد لدينا تضمن وصول المنتجات طازجة</li>
<li><strong>الراحة:</strong> طلب سهل وتوصيل سريع لباب منزلك</li>
<li><strong>الثقة:</strong> أسعار شفافة بدون رسوم مخفية</li>
<li><strong>الخدمة:</strong> رضا العملاء هو أولويتنا القصوى</li>
</ul>

<h2>لماذا تختارنا</h2>
<p>مع آلاف المنتجات والأسعار التنافسية والتوصيل في أقل من ساعة واحدة، CART يجعل تسوق البقالة بسيطًا. فريقنا المتفاني يعمل على مدار الساعة لضمان حصولك على أفضل تجربة تسوق.</p>

<h2>معلومات الاتصال</h2>
<ul>
<li><strong>البريد الإلكتروني:</strong> Cart.shopegy@gmail.com</li>
<li><strong>داخل التطبيق:</strong> الملف الشخصي → المساعدة والدعم → اتصل بالدعم</li>
</ul>

<h2>تابعنا</h2>
<p>ابقَ على تواصل معنا على وسائل التواصل الاجتماعي لآخر التحديثات والعروض والمزيد!</p>

<p>© 2026 CART. جميع الحقوق محفوظة.</p>
`;

export default function AboutScreen() {
  return (
    <StaticPageScreen
      slug="about"
      fallbackTitle="About CART"
      fallbackTitleAr="عن CART"
      fallbackContent={FALLBACK_CONTENT}
      fallbackContentAr={FALLBACK_CONTENT_AR}
      icon={<Info size={24} color={Colors.neutralWhite} />}
    />
  );
}
