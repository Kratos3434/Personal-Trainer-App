# Deviations from PRJ566
Please refer to the Software Requirements Specification (SRS) for original requirement detail:<br>
https://seneca.sharepoint.com/:w:/s/2024-09-03PRJ666NBB-Team02/EfSi_xXJZqVKtkkIzOkQrXIBS-RiBTjpzpX6sYMLT6SPSQ?e=eWBmrO.
<br>
<br>
All listed differences below are either in priorities **Must Have (MH)** or **Should Have (SH)**, lower priority such as **Nice to Have (NH)** are not included as those are optional.
<br>
<br>

2.3.1.4 Registration Page
| Req.# | Requirement | Priority | Comment |
|-------|-------------|----------|---------|
| R039 | Phone number should be valid | SH | Obsoleted as we don't need more sensitive info and email alone is suffice for registration |
| R040 | Phone number must be unique | SH | Same as above |
| R041 | Can validate on phone by sending a one-time code only if user chooses to enter | SH | Same as above |
<br>

2.3.1.6 Profile Entering Page
| Req.# | Requirement | Priority | Comment |
|-------|-------------|----------|---------|
| R059 | Height input should be able to switch between cm and feet | SH | Obsoleted as this app is intended for local use that uses metric system. No need to waste resources on converting between imperial system that no one uses at this stage |
| R060 | Weight input should be able to switch between kg and lbs | SH | Same as above |
| R061 | Height and Weight in feet and lbs should convert to cm and kg in the DB | SH | Same as above |
<br>

2.3.1.13 Progress Analysis Page
| Req.# | Requirement | Priority | Comment |
|-------|-------------|----------|---------|
| R126 | User can also see chart graphing rise or decline in height | SH | Obsoleted as height does not change often and wouldn't affect analysis|
| R130 | Email users about their progress | SH | Obsoleted as users can view their progress anytime in the app, and this is considered more junk mails to users |
| R131 |Reports should be available in different languages other than English | SH | Obsoleted as it is irrelevant |
<br>

2.3.2 Hosting Services
| Req.# | Requirement | Priority | Comment |
|-------|-------------|----------|---------|
| R146 | Integrate AI to suggest workout routine | SH | Obsoleted as we have our algorithm and data source for suggesting workout routine. Also given that AI isn't always right. |
<br>

