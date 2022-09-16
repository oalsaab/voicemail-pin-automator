export const configs = {
  targetNumber: "", /* Phone number to test voicemail pin automator on */
  pinsList: "", /* Path to txt file containing all pin numbers to try */
  pinsAttempted: "", /* Path to empty txt file to save attempted pins in */
  pinsLog: "", /* Path to empty txt file to log the incorrect/possible correct pin in */
  connectionCount: 50, /* Amount of times the automator will attempt to connect to call before failure */
  cooldown: 15, /* Specifies at what attempt number the automator will take a break */
  cooldownDuration: 120000, /* Specifies how long to take a break for in ms */
  clickerCoordinates: {x: 1720, y: 220}, /* coordinates to click to activate call button */
  clickerCount: 3, /* Specifies the amount of times to try to make the call button clickable before failure */
}