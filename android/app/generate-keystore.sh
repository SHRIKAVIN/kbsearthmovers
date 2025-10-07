#!/bin/bash

echo "=== KBS Harvesters Keystore Generation ==="
echo "This will create a keystore file to sign your app for Play Store publishing."
echo ""
echo "IMPORTANT: Remember these passwords - you'll need them for future updates!"
echo ""

# Generate keystore with pre-filled information
keytool -genkey -v \
  -keystore kbs-harvesters-key.keystore \
  -alias kbs-harvesters \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -dname "CN=KBS Harvesters, OU=IT Department, O=KBS Earthmovers, L=Kerala, S=Kerala, C=IN" \
  -storepass kbs2024! \
  -keypass kbs2024!

echo ""
echo "✅ Keystore generated successfully!"
echo "📁 Location: android/app/kbs-harvesters-key.keystore"
echo "🔑 Store Password: kbs2024!"
echo "🔑 Key Password: kbs2024!"
echo ""
echo "⚠️  IMPORTANT: Save these passwords securely!"

