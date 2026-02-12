import { Tabs, Redirect } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { Home, ClipboardList, BarChart3, User } from "lucide-react-native";
import { ActivityIndicator, View } from "react-native";

export default function TabLayout() {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc" }}>
                <ActivityIndicator size="large" color="#16a34a" />
            </View>
        );
    }

    if (!isAuthenticated) {
        return <Redirect href="/(auth)/login" />;
    }

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: "#16a34a",
                tabBarInactiveTintColor: "#9ca3af",
                tabBarStyle: {
                    backgroundColor: "#fff",
                    borderTopColor: "#e5e7eb",
                    paddingBottom: 6,
                    paddingTop: 6,
                    height: 60,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: "600",
                },
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: "Home",
                    tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="orders"
                options={{
                    title: "Orders",
                    tabBarIcon: ({ color, size }) => <ClipboardList size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="stats"
                options={{
                    title: "Earnings",
                    tabBarIcon: ({ color, size }) => <BarChart3 size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "Profile",
                    tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
                }}
            />
        </Tabs>
    );
}
