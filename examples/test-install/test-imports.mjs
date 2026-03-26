// Test core library imports
import { compressImage, KeyPool } from 'tinyimg-core'
import tinyimgUnplugin from 'tinyimg-unplugin'

console.log('✅ tinyimg-core imports successful')
console.log('  - compressImage:', typeof compressImage)
console.log('  - KeyPool:', typeof KeyPool)
console.log('✅ tinyimg-unplugin imports successful')
console.log('  - unplugin:', typeof tinyimgUnplugin)
console.log('  - unplugin.name:', tinyimgUnplugin.name)
