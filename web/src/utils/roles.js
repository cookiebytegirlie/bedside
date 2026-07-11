// Central role checks so medication/sensitive gating stays consistent across
// the app. Volunteers/aides (and the patient view) are everyone who isn't a
// nurse or family member.
export function isNurse(role) {
  return /nurse/i.test(role || '')
}

export function isFamily(role) {
  return /family/i.test(role || '')
}

// May see specific medications and other sensitive clinical detail.
export function canSeeMeds(role) {
  return /nurse|family/i.test(role || '')
}
