declare module 'react-native-uuid' {
    interface UUID {
        v4(): string;
        v1(): string;
        [key: string]: any;
    }
    const uuid: UUID;
    export default uuid;
}
