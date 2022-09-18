# VOICEMAIL PIN AUTOMATOR

**Project developed for educational purposes. Do not use for malicious purposes.**

**Only use the automator on a target phone number that you own if you wish to run the program.**

The program employs the capabilities of Puppeteer to launch a headful chromium instance, connect to a free VoIP service (textnow), and automate the process of attempting a voicemail pin.

The program will currently only work on phone numbers that are on the t-mobile carrier. The t-mobile voicemail system allows for unlimited pin attempts unlike other carriers.

In essence, the automator will call the backdoor number, enter the target's phone number and attempt a pin to get access to the voicemail system of the target.

## How it works

1. Call t-mobile voicemail backdoor number
2. Enter target's phone number
3. Enter a pin from the supplied pins txt file
4. Repeatedly click the '#' (Number/Hash/Pound sign)
5. Listen to the textnow Console logs for socket messages and evaluate changes in the DOM. Two independent methods to verify whether the attempted pin was correct/incorrect
6. If the call was disconnected remotely (i.e. by the t-mobile voicemail system) then the assumption is that the correct pin was just attempted. 
7. If the call was not disconnected after 'spamming' the '#' sign on the dialer keypad then it is assumed that the pin is incorrect and the automator will attempt the next pin

## Setup

1. Create a .env file in the root directory with the following structure: 
```
TN_USER="TEXTNOW USERNAME"
TN_PASS="TEXTNOW PASSWORD"
```

2. Create 3 txt files: 
- txt file containing all the pins you wish the automator to attempt, one pin per line (only provide 4 and 6 numeric long digits)
- empty txt file to log the pins attempted in case of program crash
- empty txt file to log the possible correct/incorrect pins with timestamp

3. Fill in the app-configs.ts file with your configurations. Leave the filled in configurations as default. If you are not on a 1920x1080 screen resolution then change the clickerCoordinates configuration, any non-clickable coordinates on the textnow post-login page will work.





