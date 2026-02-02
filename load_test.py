#!/usr/bin/env python3
"""
Load Testing Script for ElBaraka API
Tests: Registration, Login, Add to Cart, Orders
Target: 1000 concurrent users per operation
"""

import asyncio
import aiohttp
import time
import random
import string
import json
from dataclasses import dataclass
from typing import List, Dict, Any
from collections import defaultdict

# Configuration
BASE_URL = "https://cartshop.site/api"
CONCURRENT_USERS = 1000
TIMEOUT = 30

# Test Results Storage
@dataclass
class TestResult:
    operation: str
    success: int = 0
    failed: int = 0
    total_time: float = 0
    min_time: float = float('inf')
    max_time: float = 0
    errors: Dict[str, int] = None
    
    def __post_init__(self):
        if self.errors is None:
            self.errors = defaultdict(int)
    
    @property
    def avg_time(self):
        return self.total_time / max(self.success, 1)
    
    @property
    def requests_per_second(self):
        return (self.success + self.failed) / max(self.total_time, 0.001)


def generate_phone():
    """Generate Egyptian phone number"""
    return f"01{random.choice(['0', '1', '2', '5'])}{random.randint(10000000, 99999999)}"


def generate_email():
    """Generate random email"""
    chars = ''.join(random.choices(string.ascii_lowercase + string.digits, k=10))
    return f"test_{chars}@loadtest.com"


def generate_password():
    """Generate random password"""
    return ''.join(random.choices(string.ascii_letters + string.digits, k=12))


class LoadTester:
    def __init__(self, base_url: str, concurrent_users: int):
        self.base_url = base_url
        self.concurrent_users = concurrent_users
        self.results: Dict[str, TestResult] = {}
        self.tokens: List[str] = []
        self.user_credentials: List[Dict] = []
        self.product_ids: List[int] = []
        
    async def fetch_products(self, session: aiohttp.ClientSession):
        """Fetch available product IDs for cart testing"""
        try:
            async with session.get(f"{self.base_url}/v1/products?per_page=50") as resp:
                if resp.status == 200:
                    data = await resp.json()
                    products = data.get('data', {}).get('products', {}).get('data', [])
                    self.product_ids = [p['id'] for p in products if p.get('id')]
                    print(f"✓ Fetched {len(self.product_ids)} products for testing")
        except Exception as e:
            print(f"⚠ Could not fetch products: {e}")
            # Use fallback product IDs
            self.product_ids = list(range(1, 51))

    async def register_user(self, session: aiohttp.ClientSession, user_id: int) -> Dict:
        """Register a single user"""
        email = generate_email()
        phone = generate_phone()
        password = generate_password()
        
        payload = {
            "name": f"Load Test User {user_id}",
            "email": email,
            "phone": phone,
            "password": password,
            "password_confirmation": password
        }
        
        start = time.time()
        try:
            async with session.post(
                f"{self.base_url}/v1/auth/register",
                json=payload,
                timeout=aiohttp.ClientTimeout(total=TIMEOUT)
            ) as resp:
                elapsed = time.time() - start
                result = self.results["register"]
                
                if resp.status in [200, 201]:
                    result.success += 1
                    result.total_time += elapsed
                    result.min_time = min(result.min_time, elapsed)
                    result.max_time = max(result.max_time, elapsed)
                    
                    data = await resp.json()
                    token = data.get('data', {}).get('token') or data.get('token')
                    if token:
                        self.tokens.append(token)
                    self.user_credentials.append({"email": email, "password": password})
                    return {"success": True, "token": token}
                else:
                    result.failed += 1
                    error_text = await resp.text()
                    result.errors[f"HTTP {resp.status}"] += 1
                    return {"success": False, "error": error_text}
                    
        except asyncio.TimeoutError:
            self.results["register"].failed += 1
            self.results["register"].errors["Timeout"] += 1
            return {"success": False, "error": "Timeout"}
        except Exception as e:
            self.results["register"].failed += 1
            self.results["register"].errors[str(type(e).__name__)] += 1
            return {"success": False, "error": str(e)}

    async def login_user(self, session: aiohttp.ClientSession, credentials: Dict) -> Dict:
        """Login a single user"""
        payload = {
            "email": credentials["email"],
            "password": credentials["password"]
        }
        
        start = time.time()
        try:
            async with session.post(
                f"{self.base_url}/v1/auth/login",
                json=payload,
                timeout=aiohttp.ClientTimeout(total=TIMEOUT)
            ) as resp:
                elapsed = time.time() - start
                result = self.results["login"]
                
                if resp.status == 200:
                    result.success += 1
                    result.total_time += elapsed
                    result.min_time = min(result.min_time, elapsed)
                    result.max_time = max(result.max_time, elapsed)
                    
                    data = await resp.json()
                    token = data.get('data', {}).get('token') or data.get('token')
                    return {"success": True, "token": token}
                else:
                    result.failed += 1
                    result.errors[f"HTTP {resp.status}"] += 1
                    return {"success": False}
                    
        except asyncio.TimeoutError:
            self.results["login"].failed += 1
            self.results["login"].errors["Timeout"] += 1
            return {"success": False, "error": "Timeout"}
        except Exception as e:
            self.results["login"].failed += 1
            self.results["login"].errors[str(type(e).__name__)] += 1
            return {"success": False, "error": str(e)}

    async def add_to_cart(self, session: aiohttp.ClientSession, token: str) -> Dict:
        """Add item to cart"""
        product_id = random.choice(self.product_ids) if self.product_ids else random.randint(1, 100)
        
        payload = {
            "product_id": product_id,
            "quantity": random.randint(1, 3)
        }
        
        headers = {"Authorization": f"Bearer {token}"}
        
        start = time.time()
        try:
            async with session.post(
                f"{self.base_url}/v1/cart/add",
                json=payload,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=TIMEOUT)
            ) as resp:
                elapsed = time.time() - start
                result = self.results["add_to_cart"]
                
                if resp.status in [200, 201]:
                    result.success += 1
                    result.total_time += elapsed
                    result.min_time = min(result.min_time, elapsed)
                    result.max_time = max(result.max_time, elapsed)
                    return {"success": True}
                else:
                    result.failed += 1
                    result.errors[f"HTTP {resp.status}"] += 1
                    return {"success": False}
                    
        except asyncio.TimeoutError:
            self.results["add_to_cart"].failed += 1
            self.results["add_to_cart"].errors["Timeout"] += 1
            return {"success": False, "error": "Timeout"}
        except Exception as e:
            self.results["add_to_cart"].failed += 1
            self.results["add_to_cart"].errors[str(type(e).__name__)] += 1
            return {"success": False, "error": str(e)}

    async def place_order(self, session: aiohttp.ClientSession, token: str, user_idx: int) -> Dict:
        """Place an order"""
        payload = {
            "payment_method": "cash_on_delivery",
            "shipping_address": {
                "name": f"Test User {user_idx}",
                "phone": generate_phone(),
                "address": f"Test Address {user_idx}, Cairo, Egypt",
                "city": "Cairo",
                "area": "Nasr City",
                "building": str(random.randint(1, 100)),
                "floor": str(random.randint(1, 10)),
                "apartment": str(random.randint(1, 50))
            },
            "notes": f"Load test order {user_idx}"
        }
        
        headers = {"Authorization": f"Bearer {token}"}
        
        start = time.time()
        try:
            async with session.post(
                f"{self.base_url}/v1/checkout",
                json=payload,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=TIMEOUT)
            ) as resp:
                elapsed = time.time() - start
                result = self.results["place_order"]
                
                if resp.status in [200, 201]:
                    result.success += 1
                    result.total_time += elapsed
                    result.min_time = min(result.min_time, elapsed)
                    result.max_time = max(result.max_time, elapsed)
                    return {"success": True}
                else:
                    result.failed += 1
                    error_text = await resp.text()
                    result.errors[f"HTTP {resp.status}"] += 1
                    return {"success": False, "error": error_text[:100]}
                    
        except asyncio.TimeoutError:
            self.results["place_order"].failed += 1
            self.results["place_order"].errors["Timeout"] += 1
            return {"success": False, "error": "Timeout"}
        except Exception as e:
            self.results["place_order"].failed += 1
            self.results["place_order"].errors[str(type(e).__name__)] += 1
            return {"success": False, "error": str(e)}

    async def run_registration_test(self, session: aiohttp.ClientSession):
        """Run registration test for all users"""
        print(f"\n{'='*60}")
        print(f"📝 REGISTRATION TEST - {self.concurrent_users} users")
        print(f"{'='*60}")
        
        self.results["register"] = TestResult("register")
        
        start_time = time.time()
        tasks = [self.register_user(session, i) for i in range(self.concurrent_users)]
        await asyncio.gather(*tasks)
        total_time = time.time() - start_time
        
        self.results["register"].total_time = total_time
        self._print_result("register", total_time)

    async def run_login_test(self, session: aiohttp.ClientSession):
        """Run login test for registered users"""
        if not self.user_credentials:
            print("⚠ No registered users to login. Skipping login test.")
            return
            
        print(f"\n{'='*60}")
        print(f"🔐 LOGIN TEST - {len(self.user_credentials)} users")
        print(f"{'='*60}")
        
        self.results["login"] = TestResult("login")
        self.tokens = []  # Reset tokens for fresh login
        
        start_time = time.time()
        tasks = [self.login_user(session, cred) for cred in self.user_credentials]
        results = await asyncio.gather(*tasks)
        total_time = time.time() - start_time
        
        # Collect tokens from login
        for r in results:
            if r.get("success") and r.get("token"):
                self.tokens.append(r["token"])
        
        self.results["login"].total_time = total_time
        self._print_result("login", total_time)

    async def run_add_to_cart_test(self, session: aiohttp.ClientSession):
        """Run add to cart test"""
        if not self.tokens:
            print("⚠ No authenticated users. Skipping add to cart test.")
            return
            
        print(f"\n{'='*60}")
        print(f"🛒 ADD TO CART TEST - {len(self.tokens)} operations")
        print(f"{'='*60}")
        
        self.results["add_to_cart"] = TestResult("add_to_cart")
        
        start_time = time.time()
        tasks = [self.add_to_cart(session, token) for token in self.tokens]
        await asyncio.gather(*tasks)
        total_time = time.time() - start_time
        
        self.results["add_to_cart"].total_time = total_time
        self._print_result("add_to_cart", total_time)

    async def run_order_test(self, session: aiohttp.ClientSession):
        """Run order placement test"""
        if not self.tokens:
            print("⚠ No authenticated users. Skipping order test.")
            return
            
        print(f"\n{'='*60}")
        print(f"📦 ORDER PLACEMENT TEST - {len(self.tokens)} orders")
        print(f"{'='*60}")
        
        self.results["place_order"] = TestResult("place_order")
        
        start_time = time.time()
        tasks = [self.place_order(session, token, i) for i, token in enumerate(self.tokens)]
        await asyncio.gather(*tasks)
        total_time = time.time() - start_time
        
        self.results["place_order"].total_time = total_time
        self._print_result("place_order", total_time)

    def _print_result(self, operation: str, total_time: float):
        """Print test result summary"""
        result = self.results[operation]
        total = result.success + result.failed
        success_rate = (result.success / max(total, 1)) * 100
        
        print(f"\n📊 Results for {operation.upper()}:")
        print(f"   ✅ Successful: {result.success}")
        print(f"   ❌ Failed: {result.failed}")
        print(f"   📈 Success Rate: {success_rate:.1f}%")
        print(f"   ⏱️  Total Time: {total_time:.2f}s")
        print(f"   ⚡ Requests/sec: {total/total_time:.2f}")
        
        if result.success > 0:
            print(f"   📉 Min Response: {result.min_time*1000:.0f}ms")
            print(f"   📈 Max Response: {result.max_time*1000:.0f}ms")
            print(f"   📊 Avg Response: {(result.total_time/result.success)*1000:.0f}ms")
        
        if result.errors:
            print(f"   🔴 Errors:")
            for error, count in sorted(result.errors.items(), key=lambda x: -x[1])[:5]:
                print(f"      - {error}: {count}")

    def print_final_summary(self):
        """Print final test summary"""
        print(f"\n{'='*60}")
        print(f"📋 FINAL LOAD TEST SUMMARY")
        print(f"{'='*60}")
        
        total_requests = 0
        total_success = 0
        total_failed = 0
        
        for op, result in self.results.items():
            total = result.success + result.failed
            total_requests += total
            total_success += result.success
            total_failed += result.failed
            
            success_rate = (result.success / max(total, 1)) * 100
            rps = total / max(result.total_time, 0.001)
            
            status = "✅" if success_rate >= 90 else "⚠️" if success_rate >= 70 else "❌"
            print(f"\n{status} {op.upper()}:")
            print(f"   {result.success}/{total} ({success_rate:.1f}%) @ {rps:.1f} req/s")
        
        overall_success_rate = (total_success / max(total_requests, 1)) * 100
        print(f"\n{'='*60}")
        print(f"🎯 OVERALL: {total_success}/{total_requests} ({overall_success_rate:.1f}%)")
        
        if overall_success_rate >= 95:
            print("🏆 EXCELLENT - Server handles load very well!")
        elif overall_success_rate >= 85:
            print("👍 GOOD - Server handles load with minor issues")
        elif overall_success_rate >= 70:
            print("⚠️ FAIR - Server struggles under heavy load")
        else:
            print("❌ POOR - Server cannot handle this load")
        print(f"{'='*60}")

    async def run_all_tests(self):
        """Run all load tests"""
        print(f"\n{'#'*60}")
        print(f"#  ELBARAKA LOAD TEST - {self.concurrent_users} CONCURRENT USERS")
        print(f"#  Target: {self.base_url}")
        print(f"{'#'*60}")
        
        connector = aiohttp.TCPConnector(
            limit=self.concurrent_users,
            limit_per_host=self.concurrent_users,
            ttl_dns_cache=300
        )
        
        timeout = aiohttp.ClientTimeout(total=TIMEOUT, connect=10)
        
        async with aiohttp.ClientSession(
            connector=connector,
            timeout=timeout,
            headers={"Content-Type": "application/json", "Accept": "application/json"}
        ) as session:
            # Fetch products first
            await self.fetch_products(session)
            
            # Run tests sequentially
            await self.run_registration_test(session)
            await asyncio.sleep(2)  # Brief pause between tests
            
            await self.run_login_test(session)
            await asyncio.sleep(2)
            
            await self.run_add_to_cart_test(session)
            await asyncio.sleep(2)
            
            await self.run_order_test(session)
        
        self.print_final_summary()


async def main():
    """Main entry point"""
    print("\n" + "="*60)
    print("🚀 ELBARAKA API LOAD TESTER")
    print("="*60)
    print(f"📍 Target URL: {BASE_URL}")
    print(f"👥 Concurrent Users: {CONCURRENT_USERS}")
    print(f"⏱️  Timeout: {TIMEOUT}s")
    print("="*60)
    
    input("\nPress Enter to start the load test...")
    
    tester = LoadTester(BASE_URL, CONCURRENT_USERS)
    await tester.run_all_tests()


if __name__ == "__main__":
    asyncio.run(main())
