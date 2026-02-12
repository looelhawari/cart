import { Redirect } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc" }}>
                <ActivityIndicator size="large" color="#16a34a" />
            </View>
        );
    }

    if (isAuthenticated) {
        return <Redirect href="/(tabs)/home" />;
    }

    return <Redirect href="/(auth)/login" />;
}
