import { useEffect } from "react";
import { useRouter } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { getItem } from "../lib/storage";
import { colors } from "../lib/theme";

export default function Index() {
    const router = useRouter();

    useEffect(() => {
        getItem("auth_token").then((token) => {
            if (token) {
                router.replace("/player");
            } else {
                router.replace("/login");
            }
        });
    }, []);

    return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg }}>
            <ActivityIndicator size="large" color={colors.accent} />
        </View>
    );
}
