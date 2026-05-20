import AsyncStorage from "@react-native-async-storage/async-storage";

export async function getItem(key) {
    try {
        const val = await AsyncStorage.getItem(key);
        return val ? JSON.parse(val) : null;
    } catch {
        return null;
    }
}

export async function setItem(key, value) {
    try {
        await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch { }
}

export async function removeItem(key) {
    try {
        await AsyncStorage.removeItem(key);
    } catch { }
}
