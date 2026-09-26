# Pupil app — setup

The `app/` and `src/` folders here are the real screens. Create the Expo project around them
so the package versions match whatever Expo SDK is current (never hand-write Expo versions).

From the `mobile` folder:

```bash
# 1. create an Expo project in a temporary folder
cd ..
npx create-expo-app@latest _tmp-mobile --template blank-typescript

# 2. copy its config files next to our source
cp _tmp-mobile/package.json _tmp-mobile/tsconfig.json _tmp-mobile/babel.config.js mobile/ 2>/dev/null
rm -rf _tmp-mobile

# 3. install the libraries this app uses
cd mobile
npx expo install expo-router expo-sqlite expo-speech expo-audio expo-file-system \
  expo-constants expo-linking expo-status-bar react-native-safe-area-context react-native-screens \
  @react-native-async-storage/async-storage
```

Then in `package.json` set the entry point expo-router needs:

```json
"main": "expo-router/entry"
```

Keep the `app.json` in this folder (it already has the router plugin, the Android package name
and the portrait lock).

Finally:

```bash
cp .env.example .env     # set EXPO_PUBLIC_API_URL to your computer's LAN IP
npx expo start
```

The phone needs the computer's LAN address, not `localhost`:
`ipconfig getifaddr en0` on Mac, `ipconfig` on Windows. Example: `http://192.168.1.12:3000/api`.

## Building the APK for the defense

See "APK for the defense" in the root `README.md`: the commands in order, what each profile
in `eas.json` is for, and why the APK's API URL is set with `eas env:create` and not in `.env`.
Don't run `eas build:configure`, because `eas.json` is already in this folder.
