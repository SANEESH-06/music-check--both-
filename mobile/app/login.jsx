import { useState } from "react";
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { loginUser, registerUser } from "../lib/api";
import { setItem } from "../lib/storage";
import { colors } from "../lib/theme";

export default function LoginScreen() {
    const router = useRouter();
    const [isRegister, setIsRegister] = useState(false);
    const [form, setForm] = useState({
        name: "",
        email: "admin@example.com",
        password: "password123",
        plan: "premium",
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);

    function update(key, val) {
        setForm((f) => ({ ...f, [key]: val }));
    }

    async function handleSubmit() {
        setError("");
        setLoading(true);
        try {
            let data;
            if (isRegister) {
                data = await registerUser({ name: form.name, email: form.email, password: form.password, plan: form.plan });
            } else {
                data = await loginUser({ email: form.email, password: form.password });
            }
            await setItem("auth_token", data.token);
            await setItem("echowave_user", data.user);
            router.replace("/player");
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView style={s.shell} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

                {/* Hero */}
                <View style={s.hero}>
                    <View style={s.heroIcon}>
                        <Ionicons name="headset" size={36} color={colors.accent} />
                    </View>
                    <Text style={s.heroEyebrow}>EchoWave Premium</Text>
                    <Text style={s.heroTitle}>Sign in before{"\n"}the music starts.</Text>
                    <Text style={s.heroSub}>High-fidelity playback, playlists, and a premium studio experience.</Text>
                </View>

                {/* Card */}
                <View style={s.card}>
                    <Text style={s.eyebrow}>{isRegister ? "Create Account" : "Account Access"}</Text>
                    <Text style={s.heading}>{isRegister ? "Sign Up" : "Login"}</Text>

                    {isRegister && (
                        <View style={s.field}>
                            <Text style={s.label}>Full Name</Text>
                            <View style={s.inputWrap}>
                                <Ionicons name="person-outline" size={18} color={colors.muted} />
                                <TextInput style={s.input} value={form.name} onChangeText={(v) => update("name", v)} placeholder="John Doe" placeholderTextColor={colors.muted} />
                            </View>
                        </View>
                    )}

                    <View style={s.field}>
                        <Text style={s.label}>Email address</Text>
                        <View style={s.inputWrap}>
                            <Ionicons name="mail-outline" size={18} color={colors.muted} />
                            <TextInput style={s.input} value={form.email} onChangeText={(v) => update("email", v)}
                                placeholder="you@example.com" placeholderTextColor={colors.muted}
                                keyboardType="email-address" autoCapitalize="none" />
                        </View>
                    </View>

                    <View style={s.field}>
                        <Text style={s.label}>Password</Text>
                        <View style={s.inputWrap}>
                            <Ionicons name="lock-closed-outline" size={18} color={colors.muted} />
                            <TextInput style={[s.input, { flex: 1 }]} value={form.password} onChangeText={(v) => update("password", v)}
                                placeholder="Enter your password" placeholderTextColor={colors.muted}
                                secureTextEntry={!showPass} autoCapitalize="none" />
                            <TouchableOpacity onPress={() => setShowPass((v) => !v)}>
                                <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={18} color={colors.muted} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {isRegister && (
                        <View style={s.field}>
                            <Text style={s.label}>Plan</Text>
                            <View style={s.planRow}>
                                {["premium", "free"].map((p) => (
                                    <TouchableOpacity key={p} style={[s.planBtn, form.plan === p && s.planBtnActive]} onPress={() => update("plan", p)}>
                                        <Text style={[s.planBtnText, form.plan === p && s.planBtnTextActive]}>{p === "premium" ? "Premium" : "Free"}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {!!error && <Text style={s.error}>{error}</Text>}

                    <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>{isRegister ? "Sign up" : "Sign in"}</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => { setIsRegister((v) => !v); setError(""); }} style={s.switchRow}>
                        <Text style={s.switchText}>
                            {isRegister ? "Already have an account? " : "New to EchoWave? "}
                            <Text style={s.switchLink}>{isRegister ? "Sign In" : "Create one now"}</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const s = StyleSheet.create({
    shell: { flex: 1, backgroundColor: colors.bg },
    scroll: { flexGrow: 1, padding: 20 },
    hero: { alignItems: "center", paddingVertical: 40 },
    heroIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center", marginBottom: 16 },
    heroEyebrow: { color: colors.accent, fontSize: 11, fontWeight: "800", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 },
    heroTitle: { fontSize: 28, fontWeight: "900", color: colors.text, textAlign: "center", lineHeight: 34, marginBottom: 10 },
    heroSub: { color: colors.muted, fontSize: 14, textAlign: "center", lineHeight: 20, maxWidth: 280 },
    card: { backgroundColor: colors.surface, borderRadius: 20, padding: 24, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 20, elevation: 4 },
    eyebrow: { color: colors.accent, fontSize: 10, fontWeight: "800", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 },
    heading: { fontSize: 22, fontWeight: "900", color: colors.text, marginBottom: 20 },
    field: { marginBottom: 16 },
    label: { fontSize: 12, fontWeight: "700", color: colors.text, marginBottom: 6 },
    inputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, height: 48, gap: 8 },
    input: { flex: 1, color: colors.text, fontSize: 14 },
    planRow: { flexDirection: "row", gap: 10 },
    planBtn: { flex: 1, height: 40, borderRadius: 999, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
    planBtnActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
    planBtnText: { fontSize: 13, fontWeight: "600", color: colors.muted },
    planBtnTextActive: { color: colors.accent, fontWeight: "700" },
    error: { color: colors.danger, fontSize: 13, marginBottom: 12 },
    submitBtn: { backgroundColor: colors.accent, borderRadius: 999, height: 50, alignItems: "center", justifyContent: "center", marginTop: 4 },
    submitText: { color: "#fff", fontSize: 15, fontWeight: "800" },
    switchRow: { marginTop: 16, alignItems: "center" },
    switchText: { fontSize: 13, color: colors.muted },
    switchLink: { color: colors.accent, fontWeight: "700" },
});
