# זמן משחק

אפליקציה סטטית בעברית למעקב אחר מכסת זמן משחק שבועית. מצב `fakelocal`
פועל כולו בדפדפן ושומר שינויים ב־`localStorage`. מתאם Google Apps Script קיים
כשלד בלבד, עד להגדרת כתובת ה־API.

אפשר לנווט בין שבועות קודמים. הסיכום, החריגות, היסטוריית המשחק ושינוי המכסה
מתעדכנים בהתאם לשבוע שנבחר.

## הרצה מקומית

יש להריץ שרת מקומי מתוך תיקיית הפרויקט, למשל:

```bash
python -m http.server 8000
```

לאחר מכן פותחים:

- תצוגת ילד: `http://localhost:8000/?data=fakelocal`
- תצוגת הורה: `http://localhost:8000/?data=fakelocal&mode=parent`
- בדיקת Google Sheet: `http://localhost:8000/?data=fakesheet&mode=parent`

הכינויים `data=fakesheet` ו־`data=fakedata` נתמכים שניהם ומפנים לטאב
`fakedata`.

אין לפתוח את `index.html` ישירות באמצעות `file://`, מפני שהאפליקציה משתמשת
במודולים של JavaScript.

## פריסה ב־GitHub Pages

1. מעלים את תוכן התיקייה לשורש מאגר GitHub.
2. ב־GitHub פותחים **Settings → Pages**.
3. בוחרים **Deploy from a branch**, את הענף `main`, ואת התיקייה `/ (root)`.
4. פותחים את הכתובת ש־GitHub מציג ומוסיפים `?data=fakelocal` לבדיקה.

## חיבור עתידי ל־Google Sheets

כתובת ה־Apps Script המופעלת כבר מוגדרת ב־`js/adapters/google-sheets-adapter.js`.
המתאם מצפה ל־API המחזיר `{ sessions, weeklyAdjustments }` ומקבל פעולות
`saveSession`, `deleteSession` ו־`setWeeklyAdjustment`. במצב `data=fakesheet`
נשלח גם `sheet=fakedata`; בכל מצב נתונים אחר נשלח `sheet=production`.
