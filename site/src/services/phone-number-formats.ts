import parsePhoneNumber from 'libphonenumber-js'

export function formatPhoneNumber (phoneNumber: string) {
  const result = parsePhoneNumber(phoneNumber)
  if (!result) {
    return phoneNumber
  }
  const { countryCallingCode } = result
  return `(+${countryCallingCode}) ${phoneNumber.split(countryCallingCode)[1]}`
}

export function simplifyPhoneNumber (formattedPhoneNumber: string) {
  return formattedPhoneNumber ? formattedPhoneNumber.replace('(', '').replace(')', '') : formattedPhoneNumber
}
