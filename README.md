# metriX — Step 5: Mentions Pipeline Test

This version verifies the mentions analytics pipeline before connecting external APIs.

What works:
- Add a manual test mention to a project
- Associate it with a keyword
- Store platform, author, content, URL, likes, shares, replies, views, sentiment, date
- Project dashboard calculates:
  - Mentions
  - Reach
  - Engagement = likes + shares + replies
  - Positive sentiment %
- Main dashboard aggregates all user mentions
- Mentions feed appears on the project page

Test:
1. Open University of Jeddah.
2. Add a test X mention.
3. Example:
   content: "University of Jeddah launches a new student service."
   likes: 120
   shares: 30
   replies: 10
   views: 5000
   sentiment: positive
4. Submit.
5. Project KPIs should become:
   Mentions 1
   Reach 5,000
   Engagement 160
   Positive sentiment 100%

Next: connect real X data/API and remove or hide the manual test form.
