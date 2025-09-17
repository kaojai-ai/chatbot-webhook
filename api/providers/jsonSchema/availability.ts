import { ResponseFormatTextJSONSchemaConfig } from "openai/resources/responses/responses"

export const availabilitySchema: ResponseFormatTextJSONSchemaConfig = {
  "type": "json_schema",
  "name": "merged_daily_availability",
  "strict": true,
  "schema": {
    "type": "object",
    "title": "MergedDailyAvailability",
    "description": "Daily availability with merged, human-friendly time ranges in user requested lang, ignoring resources.",
    "additionalProperties": false,
    "properties": {
      "intro": {
        "type": "string",
        "title": "IntroMessage",
        "description": "friendly user message with emoji repeat the inquiry of user and repeat user's requested time range in this intro also"
      },
      "cta": {
        "type": "string",
        "title": "CTAoMessage",
        "description": "friendly user message with emoji encourage user to book or need more info"
      },
      "availableDays": {
        "type": "array",
        "title": "Available Days",
        "description": "List of per-day availability lines.",
        "minItems": 1,
        "items": {
          "type": "object",
          "title": "DayAvailability",
          "additionalProperties": false,
          "properties": {
            "date": {
              "type": "string",
              "format": "date",
              "description": "Availabiltiy date"
            },
            "dateFormat": {
              "type": "string",
              "description": "Date in human readable format"
            },
            "availabilityText": {
              "type": "string",
              "minLength": 1,
              "description": "friendly short text. Start with these are available slot, then follow by merged time ranges for that date in human friendly langauge. Example: 'Available time are 9 - 12 O'Clock' in user requested lang. Adjacent slots must be merged. Ignore resource names."
            }
          },
          "required": [
            "date",
            "dateFormat",
            "availabilityText"
          ]
        }
      }
    },
    "required": [
      "intro",
      "cta",
      "availableDays"
    ]
  }
}


export const systemUserRoles = [{
  role: 'system',
  content: `You are a helpful assistant man that formats ski/snowboard slope availability information.
Respond with a very short, clear, friendly message, with emoji in user requested language that summarizes the availability details. Start by telling about the range user requested date in user requested language. If no availability, encourage user to input some date`,
}]
