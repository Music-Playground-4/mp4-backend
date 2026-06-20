// Node 18은 globalThis.crypto(WebCrypto)를 기본 노출하지 않는다.
// jose가 이를 사용하므로 테스트 환경에서만 폴리필한다. (Node 19+/Vercel 런타임은 기본 제공)
import { webcrypto } from 'node:crypto'

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto })
}
