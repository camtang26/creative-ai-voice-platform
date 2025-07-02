import { parsePhoneNumberFromString } from 'libphonenumber-js'

// Phone number validation
export function validatePhoneNumber(phone: string): { isValid: boolean; error?: string; formatted?: string } {
  if (!phone || phone.trim() === '') {
    return { isValid: false, error: 'Phone number is required' }
  }

  try {
    let phoneNumber;
    
    // Check if number already has a country code (starts with +)
    if (phone.startsWith('+')) {
      // Try to parse as-is (already has country code)
      phoneNumber = parsePhoneNumberFromString(phone)
      
      // Check if it's an Australian number
      if (phoneNumber && phoneNumber.isValid() && phoneNumber.country !== 'AU') {
        return { isValid: false, error: 'Only Australian phone numbers are supported' }
      }
    } else {
      // No country code, default to Australian
      phoneNumber = parsePhoneNumberFromString(phone, 'AU')
      
      // If parsing failed but the number might be valid without leading 0
      if (!phoneNumber && phone.startsWith('0')) {
        phoneNumber = parsePhoneNumberFromString(phone.substring(1), 'AU')
      }
    }
    
    if (!phoneNumber) {
      return { isValid: false, error: 'Invalid phone number format' }
    }
    
    if (!phoneNumber.isValid()) {
      return { isValid: false, error: 'Phone number is not valid' }
    }
    
    return { 
      isValid: true, 
      formatted: phoneNumber.format('E.164') // Returns +61234567890 format
    }
  } catch (error) {
    return { isValid: false, error: 'Invalid phone number format' }
  }
}

// Email validation
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  if (!email || email.trim() === '') {
    return { isValid: true } // Email is optional
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Invalid email format' }
  }
  
  return { isValid: true }
}

// Campaign name validation
export function validateCampaignName(name: string): { isValid: boolean; error?: string } {
  if (!name || name.trim() === '') {
    return { isValid: false, error: 'Campaign name is required' }
  }
  
  if (name.length < 3) {
    return { isValid: false, error: 'Campaign name must be at least 3 characters' }
  }
  
  if (name.length > 100) {
    return { isValid: false, error: 'Campaign name must be less than 100 characters' }
  }
  
  return { isValid: true }
}

// First message validation
export function validateFirstMessage(message: string): { isValid: boolean; error?: string } {
  if (!message || message.trim() === '') {
    return { isValid: false, error: 'First message is required' }
  }
  
  if (message.length < 10) {
    return { isValid: false, error: 'First message must be at least 10 characters' }
  }
  
  if (message.length > 500) {
    return { isValid: false, error: 'First message must be less than 500 characters' }
  }
  
  return { isValid: true }
}

// Agent prompt validation (optional)
export function validateAgentPrompt(prompt: string): { isValid: boolean; error?: string } {
  // Prompt is optional
  if (!prompt || prompt.trim() === '') {
    return { isValid: true }
  }
  
  if (prompt.length > 2000) {
    return { isValid: false, error: 'Agent prompt must be less than 2000 characters' }
  }
  
  return { isValid: true }
}

// Google Sheet ID validation
export function validateGoogleSheetId(idOrUrl: string): { isValid: boolean; error?: string; sheetId?: string } {
  if (!idOrUrl || idOrUrl.trim() === '') {
    return { isValid: false, error: 'Google Sheet ID or URL is required' }
  }
  
  // Extract ID from URL if provided
  const match = idOrUrl.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  const sheetId = match ? match[1] : idOrUrl
  
  // Basic validation for sheet ID format
  if (!/^[a-zA-Z0-9-_]+$/.test(sheetId)) {
    return { isValid: false, error: 'Invalid Google Sheet ID format' }
  }
  
  if (sheetId.length < 20 || sheetId.length > 100) {
    return { isValid: false, error: 'Invalid Google Sheet ID length' }
  }
  
  return { isValid: true, sheetId }
}

// CSV file validation
export function validateCSVFile(file: File): { isValid: boolean; error?: string } {
  if (!file) {
    return { isValid: false, error: 'Please select a file' }
  }
  
  // Check file type
  const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/csv']
  if (!validTypes.includes(file.type) && !file.name.endsWith('.csv')) {
    return { isValid: false, error: 'Please upload a CSV file' }
  }
  
  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return { isValid: false, error: 'File size must be less than 10MB' }
  }
  
  return { isValid: true }
}