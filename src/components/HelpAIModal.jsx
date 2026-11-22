import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Send, Sparkles, ThumbsDown, ThumbsUp, X } from 'lucide-react'
import AIRichText from './AIRichText'

const SCREEN_LABELS = {
  chats: 'Chats',
  status: 'Status',
  community: 'Community',
  calls: 'Calls',
}

const KNOWLEDGE = [
  {
    id: 'help',
    keys: ['ai', 'bot', 'help', 'madad', 'kaun', 'who are you', 'sawal'],
    answer:
      'Main ChatWave AI hoon — aapka in-app guide. Mujhe pure app ki har feature, har button aur har setting pata hai. Koi bhi topic likho, ya niche chips dabao. "Aur detail" likhkar pehle jawab ka zyada vivid varan mil sakta hai.',
    extra:
      'Main offline kaam karta hoon — koi API key, internet ya cost nahi. Try karo: "shortcuts", "wallpaper", "group members", "screen share", "settings".',
    related: ['features', 'settings', 'shortcuts', 'developer'],
  },
  {
    id: 'developer',
    keys: ['developer', 'shivam', 'creator', 'banaya', 'who made', 'portfolio', 'github', 'linkedin', 'aapne', 'aap kaun'],
    answer:
      'ChatWave Shivam Kumar ne banaya — ek developer jo polished, real-world web products banate hain. Unhone ChatWave scratch se sirf 1 week me complete kiya: frontend, realtime chat, audio/video calls, groups, wallpapers, notifications, PWA aur backend sab khud handle kiya. Ye app isliye banaya taaki doosre log ek quality chat app use kar sakein aur unki capability ek kaam karne wale product se pata chale.',
    extra:
      'GitHub: github.com/shivamkumar0097 · LinkedIn: linkedin.com/in/shivamkumar0097 · Portfolio: shivamkumar0097.netlify.app. Unka focus clean design, smooth UX aur actually kaam karne wali features par hai.',
    related: ['features', 'help'],
  },
  {
    id: 'contact-developer',
    keys: ['contact', 'contact kare', 'kaise contact', 'sanse mpark', 'reach', 'message kare', 'contact details', 'portfolio contact', 'jawab de'],
    answers: [
      'Sabse aasan tarika: unki portfolio kholo — shivamkumar0097.netlify.app — neeche scroll karo, contact section mil jayega. Wahi se message kar sakte ho.',
      'Portfolio ke bottom me contact section hai, bas thoda scroll karna padega: shivamkumar0097.netlify.app',
      'Professional baat ho to LinkedIn se message kar sakte ho, code-related ho to GitHub. Dono links portfolio me hain.',
      'Unki portfolio site ke neeche contact options diye hain — wahi se direct reach kar sakte ho: shivamkumar0097.netlify.app',
    ],
    extra: 'Portfolio: shivamkumar0097.netlify.app • LinkedIn: linkedin.com/in/shivamkumar0097/ • GitHub: github.com/shivamkumar0097',
    related: ['developer', 'help'],
  },
  {
    id: 'features',
    keys: ['features', 'sab features', 'poora', 'pura', 'ek ek', 'saare', 'list', 'sab kuch'],
    answer: `Poori ChatWave ek nazar me:
• Messages — text, emoji, photo/file, voice note, reply, edit, delete, copy, forward, reactions, double-tap ❤️, star, pin bar, multi-select, search, export.
• Chats — new chat, new group, QR scan, pin/archive/mute, read/unread, block, clear chat, filters (All/Unread/Favorites/Groups/Archived).
• Groups — members add/remove, rename, admin transfer, delete/leave.
• Calls — voice, video, ringing animation, mute, camera switch, 7 filters, screen share, minimize + notification, history.
• Tabs — Chats, Status, Community, Calls.
• Profile/Settings — name, username, avatar, color, bio, QR, screen lock, theme, push, sounds, read receipts, haptics, reduce motion, Help & AI.`,
    extra:
      'Har topic pe alag detail chahiye? Bas uska naam likho — jaise "status", "screen share" ya "settings". "Aur" likhkar kisi bhi jawab ka extended version milta hai.',
    related: ['messages', 'calls', 'settings'],
  },
  {
    id: 'shortcuts',
    keys: ['shortcut', 'keyboard', 'escape', 'enter', 'slash', 'back button', 'gesture'],
    answer: `Shortcuts aur gestures:
• Escape — modals, menus, QR scanner, filters panel, help panel, sidebar menu band karta hai.
• Enter — message send; group rename save; help me sawaal send.
• Swipe right (message) → Reply; double-tap → ❤️; long-press → actions sheet.
• Chat list me long-press → context menu (pin/archive/mute/read/block).
• Bottom nav ki tab pill ko drag/swipe karke tabs badal sakte ho.
• Back button — chat se home, modal se pichhe, aur call ke time call minimize.
• "/" sidebar search me shortcut hint ke liye dikhta hai.`,
    extra:
      'Mobile par voice note record karte waqt cancel aur send buttons hote hain. Call me Back dabana call ko band nahi karta — wo minimize hoke notification me chala jata hai.',
    related: ['help', 'messages', 'minimize-call'],
  },
  {
    id: 'messages',
    keys: ['message', 'text', 'emoji', 'attachment', 'photo bhej', 'file', 'voice note', 'draft', 'link'],
    answer: `Message bhejne ke saare tareeke:
• Composer me type karke Send ya Enter.
• 😊 se emoji, 📎 se Photo/Video/Audio/Document (pdf, doc, xls, txt, zip).
• Image limit ~5 MB, file limit ~25 MB; attachment ke saath caption likh sakte ho.
• Mic se voice note — max ~5 minute, cancel/send options; audio file bhi voice note ki tarah dikhti hai.
• Drafts composer me bache rehte hain; link auto-clickable card ban jata hai.`,
    extra:
      'Photos/videos inline card me play/dikhte hain, file card me name + size. Text me URL likho to EmojiText usse link bana deta hai. Voice note me waveform + duration dikhta hai.',
    related: ['reply', 'forward', 'delete'],
  },
  {
    id: 'reply',
    keys: ['reply', 'jawab', 'swipe reply', 'quote'],
    answer:
      'Message pe long-press → Reply, ya message par right-swipe (~34 px threshold) → reply mode. Desktop par hover me bhi Reply button aata hai. Reply quote bubble ke upar dikhta hai aur X se cancel hota hai.',
    extra:
      'Swipe direction aapke own/other message ke hisaab se ulti hoti hai. Reply karne par composer me "Replying to…" bar dikhta hai.',
    related: ['messages', 'edit', 'forward'],
  },
  {
    id: 'edit',
    keys: ['edit', 'badal', 'sudhar'],
    answer:
      'Sirf apne bheje hue text message ko long-press → Edit message. Edit bar me naya text likhkar save; Cancel se wapas. Edit hone par message ke paas "edited" label lag jata hai.',
    extra:
      'Photo/file/voice note edit nahi hote. Group me doosre ke message edit nahi kar sakte. Edit history save nahi hoti.',
    related: ['delete', 'message-info'],
  },
  {
    id: 'delete',
    keys: ['delete', 'hatao', 'mitao', 'for everyone', 'for me'],
    answer: `Long-press → Delete message:
• Delete for me — sirf aapke device se chhupa.
• Delete for everyone — sirf apne messages par available, saab ke liye hat jata hai.
Confirm dialog aata hai: "Delete message? This cannot be undone."
Multi-select me jo delete hota hai wo for-me hota hai (confirm ke bina).`,
    extra:
      'Deleted message ki jagah "Message deleted" likha dikhta hai. Export me bhi placeholder aata hai.',
    related: ['multi-select', 'clear-chat'],
  },
  {
    id: 'copy',
    keys: ['copy', 'clipboard', 'naka'],
    answer:
      'Text message pe long-press → Copy text. Content clipboard me copy ho jata hai, kisi bhi app me paste kar sakte ho. Media message me ye option nahi hota.',
    extra: 'Username copy karne ke liye chat list context menu → Copy username (@username).',
    related: ['messages', 'block'],
  },
  {
    id: 'forward',
    keys: ['forward', 'aage bhej', 'share message'],
    answer:
      'Long-press → Forward → targets list (contacts + groups) me se koi chuno. Contact chunne par uske saath chat auto-start ho kar message bheja jata hai. Forward kiya hua message "Forwarded" label ke saath dikhta hai.',
    extra:
      'Multi-select se kai messages forward karte ho to modal me "N messages" dikhta hai aur sab sequence me bheje jate hain. Targets na hon to "No contacts or groups available to forward to" toast aata hai.',
    related: ['multi-select', 'messages'],
  },
  {
    id: 'reactions',
    keys: ['reaction', 'heart', 'double tap', 'double click', 'emoji reaction', 'love'],
    answer:
      'Message pe double-tap (desktop par double-click) → ❤️ reaction turant lag jati hai aur chhota burst animation chalta hai. Long-press me 6 reactions: ❤️ 😂 😮 😢 🙏 👍. Hover par React (Smile) button bhi hai. Doosre ki reaction pe tap karke apni reaction toggle/change kar sakte ho.',
    extra:
      'Reaction counts bubble ke niche dikhte hain. Haptics on ho to vibration bhi hoti hai.',
    related: ['messages', 'star'],
  },
  {
    id: 'star',
    keys: ['star', 'starred', 'save message', 'important'],
    answer:
      'Long-press → Star message. ⋮ menu → Starred messages me saare starred messages milte hain. Us list me kisi entry pe tap → us message par jump + 1.6 second highlight. "Remove from starred" se hata sakte ho.',
    extra:
      'Star per-device localStorage me save hota hai (server par nahi). Bubble ke time row me chhota star icon bhi dikhta hai.',
    related: ['pin-message', 'search'],
  },
  {
    id: 'pin-message',
    keys: ['pinned message', 'pin message', 'pinned bar', 'upar message', 'message pin', 'pinned'],
    answer:
      'Message pe long-press → Pin message. Pin karte hi header ke niche "pinned bar" ban jata hai us chat ka. Bar me naam + message preview dikhta hai; tap karne par us message par scroll, X se unpin. Har chat me max 5 pinned messages.',
    extra:
      'Ye "Pin chat" se alag hai: Pin chat sidebar me conversation ko upar rakhta hai, Pin message us chat ke andar message ko. Pinned messages is device par save hote hain.',
    related: ['pin-chat', 'multi-select'],
  },
  {
    id: 'multi-select',
    keys: ['multi', 'select', 'bulk', 'kai messages', 'multiple'],
    answer:
      'Long-press → Select messages. Pehla message select ho jata hai, phir dusre messages tap karke selection badhao (circle check dikhta hai). Upar "N selected" bar me Forward aur Delete hote hain. X ya Escape se cancel. Delete hue messages selection me nahi aate.',
    extra:
      'Bulk forward me saare messages ek saath bheje jate hain. Bulk delete "for me" hota hai aur confirm nahi mangta — careful!',
    related: ['forward', 'delete', 'pin-message'],
  },
  {
    id: 'search',
    keys: ['search', 'dhundho', 'find', 'khoj'],
    answer: `search do jagah hai:
• Sidebar me upar search box — chats ke naam dhoondhta hai; "All/Unread/Favorites/Groups" tabs bhi yahin hain.
• Chat ke ⋮ → Search messages (mobile par icon chhupa hota hai, menu se hi khulega) — us chat ke last 30 text matches.
Kisi result pe tap → jump + 1.6 sec highlight.`,
    extra:
      'Sidebar search me "/" hint dikhta hai. Archived chats alag section me hote hain — unme search tab alag hota hai.',
    related: ['sidebar', 'star'],
  },
  {
    id: 'message-info',
    keys: ['message info', 'status', 'seen', 'delivered', 'read receipt'],
    answer:
      'Long-press → Message info: time, Sent/Edited/Forwarded details aur status row. Status sirf apne messages ke liye dikhti hai — "Read" ya "Delivered". Bubble ke niche ✓ (sent), ✓✓ (delivered/read) icons dikhte hain.',
    extra:
      'Read receipts setting band karne par doosre ko pata nahi chalta ki tumne padha. Group me read status aggregate hota hai.',
    related: ['settings', 'edit'],
  },
  {
    id: 'export',
    keys: ['export', 'download chat', 'backup', 'txt'],
    answer:
      '⋮ menu → Export chat. `chatwave-<naam>.txt` file download hoti hai. Usme timestamps, sender names, "You" labels, aur media ke liye [Photo] / [File: name] / [Message deleted] placeholders hote hain. Media khud included nahi hota.',
    extra:
      'Ye local backup hai — cloud backup nahi. Purane messages 1000 limit se zyada export nahi hote (load limit).',
    related: ['search', 'settings'],
  },
  {
    id: 'disappearing',
    keys: ['disappearing', 'timer', 'view once', 'expire', 'ghum', 'after viewing'],
    answer: `⋮ → Disappearing messages me sirf 3 options hain:
• Off
• 24 hours
• After viewing
Timer sirf uske baad bheje gaye nayi messages par lagta hai — purani messages par asar nahi. "After viewing" me message dekhte hi expire hota hai.`,
    extra:
      'Bubble par clock icon iski nishani hai. Ye per-chat setting hai aur sirf is device par nahi — messages ke saath DB me bhi hoti hai.',
    related: ['messages', 'message-info'],
  },
  {
    id: 'new-chat',
    keys: ['new chat', 'start chat', 'contact', 'naya chat'],
    answer:
      'Sidebar ke + ya ✉️ button / ⋮ menu → New chat. Search box me **username** likhna hota hai (partial match chalta hai), results tab likhte hi dikhte hain. "Message" button ya contact pe tap karte hi chat start. Blocked users list me nahi aate. Escape se modal band.',
    extra:
      'Contacts list saare registered users ki hoti hai — sirf blocked log nikale gaye hote hain. QR scan se bhi naya chat start ho sakta hai.',
    related: ['qr', 'new-group'],
  },
  {
    id: 'new-group',
    keys: ['new group', 'group banao', 'create group', 'naya group'],
    answer:
      'Sidebar me 👥 / ⋮ → New group. Group naam (max 60 chars) likho, username search se members chuno, removable chips se hatao, "N selected" dikh jata hai. Create dabao — group ban kar open ho jata hai. Kam se kam 1 member zaroori hai ("Pick at least one person").',
    extra:
      'Group icon chhote screens par chhupa hota hai — wahan ⋮ menu se New group. Create fail hone par modal ab nahi band hota (input bachta hai).',
    related: ['group-members', 'community'],
  },
  {
    id: 'group-members',
    keys: ['group members', 'add member', 'remove member', 'admin', 'transfer', 'leave group', 'delete group', 'group rename', 'group'],
    answer: `Group → ⋮ → Group members:
• Admin ke liye: Rename group (pencil), username search se Add, Crown se Transfer admin (Confirm chahiye), trash se Remove, Delete group (Confirm delete).
• Sab ke liye: members list, online dots, "Group admin" label.
• Leave group — confirmation popup ke baad ("Cancel" / "Leave group").
Add/Remove sirf creator (admin) kar sakta hai — RLS rules. Non-admin sirf khud leave kar sakta hai.`,
    extra:
      'Rename me input par Enter save aur Escape cancel. Admin group chhodne ke liye pehle admin transfer ya delete kar sakta hai — ab admin ke paas bhi "Leave group" option hai.',
    related: ['new-group', 'header', 'pin-chat'],
  },
  {
    id: 'header',
    keys: ['header', 'name click', 'photo click', 'contact info', 'group info', 'manage members', 'shared photos'],
    answer:
      'Chat header me naam/photo pe click: personal chat me "View contact" panel (profile, notification toggle, Shared photos count, block), group me "Group members" modal (Manage members). Group info panel me "Manage members" row bhi hoti hai.',
    extra:
      'Home list me photo pe click se alag actions sheet aati hai — personal me Chat/Call/Video/Info, group me Chat/Members. Photo pe click karke full-screen zoom bhi kar sakte ho.',
    related: ['group-members', 'contact-actions', 'block'],
  },
  {
    id: 'contact-actions',
    keys: ['contact actions', 'photo zoom', 'avatar click home', 'view photo'],
    answer:
      'Home/chat list me kisi ki photo pe click → actions sheet: bada profile photo (tap karke full-screen zoom), naam/username/bio, aur niche labelled buttons — Chat, Call, Video, Info. Group ke liye sirf Chat aur Members buttons dikhte hain.',
    extra:
      'Chat button us chat ko open karta hai, Call/Video turant call start karte hai, Info contact card ya group members kholti hai.',
    related: ['header', 'voice-call', 'qr'],
  },
  {
    id: 'pin-chat',
    keys: ['pin chat', 'unpin chat', 'favorite', 'favourite'],
    answer:
      'Chat list me long-press → Pin chat. Pinned chats upar aate hain aur sidebar "Favorites" tab me dikhte hain. ⋮ menu se bhi Pin/Unpin kar sakte ho. Ye "Pin message" se alag hai.',
    extra:
      'Archived chats pin karne par bhi favorites me dikhte hain? Nahi — archived alag section me hote hain.',
    related: ['pin-message', 'archive', 'sidebar'],
  },
  {
    id: 'archive',
    keys: ['archive', 'unarchive', 'archived'],
    answer:
      'Long-press ya ⋮ → Archive chat. Archived chats sidebar ke "Archived" section me (sirf tab dikhta hai jab koi archived ho ya aap wo dekh rahe ho). "Back to chats" se wapas. Search placeholder bhi "Search archived chats" ho jata hai.',
    extra:
      'Archive karne se chat delete nahi hoti — messages wahi rehte hain, bas list se chhup jati hai.',
    related: ['clear-chat', 'sidebar'],
  },
  {
    id: 'mute',
    keys: ['mute', 'unmute', 'notification band', '8 hours', '1 week', 'always'],
    answer: `Mute do tareeke se:
• Chat list me long-press → Mute/Unmute = seedha forever (turant).
• Chat ke ⋮ → Mute notifications modal = 8 hours, 1 week, Always, ya Unmute.
Muted chat ke upar/header me bell-off icon aur "Muted notifications" likha dikhta hai.`,
    extra:
      'Important: mute sirf **sound** band karta hai — desktop notifications aur push abhi bhi aa sakte hain. Poori app ki notification sound band karne ke liye Sidebar ⋮ → Mute notifications.',
    related: ['settings', 'pin-chat'],
  },
  {
    id: 'mark-read',
    keys: ['mark read', 'mark unread', 'unread', 'padha', 'anpadh'],
    answer:
      'Chat list me long-press → Mark as read / Mark as unread. Sidebar me "Unread" tab sirf unread chats dikhati hai. Unread count green badge me hota hai aur browser title "(N) ChatWave" bhi dikhta hai.',
    extra:
      'Naye message par chat automatically read ho jata hai jab aap us chat me khulte ho. Timeline me "Unread messages" divider bhi banta hai.',
    related: ['sidebar', 'message-info'],
  },
  {
    id: 'block',
    keys: ['block', 'unblock', 'copy username', 'view profile', 'report'],
    answer:
      'Chat list me long-press → View profile / Block contact / Copy username. Blocked user search se chhup jata hai, call aur forward block hota hai. Profile card se Unblock bhi kar sakte ho. Group chats me ye options dikhte nahi (group me kai members hote hain).',
    extra:
      'Copy username "@username" format me clipboard me jata hai. Block client-side filter hai — server par message/call rokne ke liye RLS alag hai.',
    related: ['header', 'new-chat'],
  },
  {
    id: 'clear-chat',
    keys: ['clear chat', 'chat saaf', 'hide messages'],
    answer:
      'Chat list me long-press → Clear chat → confirmation. Ye sirf aapke device se messages chhupata hai; doosre user ki copy me koi asar nahi. Archive se alag — yahan timeline local me hide hoti hai.',
    extra: 'Delete for everyone se alag: ye DB me nahi chhuta, bas local hidden list me jata hai.',
    related: ['delete', 'archive'],
  },
  {
    id: 'sidebar',
    keys: ['sidebar', 'tabs', 'all', 'groups tab', 'favorites tab', 'archived section'],
    answer: `Sidebar layout:
• Upar: ChatWave logo, New chat ✉️, New group 👥, QR scan, ⋮ menu (Profile, Mute notifications, Settings, Log out).
• Search box (nam se chat dhundho) + "/" hint.
• Tabs: All, Unread, Favorites (pinned chats), Groups.
• Neeche Archived section (jab zarurat ho).
• Upar "+" button se bhi naya chat/group.`,
    extra:
      'Pinned chats upar sort hote hain. Chat list me har row me avatar, naam, last message, time, unread badge, pin icon, group icon dikhte hain.',
    related: ['pin-chat', 'search', 'settings'],
  },
  {
    id: 'qr',
    keys: ['qr', 'scan', 'qr code', 'scanner'],
    answer:
      'Sidebar me QR icon se scanner kholta hai — doosre ka QR scan karte hi uska username nikal kar chat start hota hai. Apna QR dikhane ke liye: Profile tab me QR button ya Settings → Show my QR code → Open. Camera permission chahiye; Escape se scanner band.',
    extra:
      'QR me username hota hai, phone number nahi. Scan ke baad "No account found with that username" tab aata hai jab username DB me na mile.',
    related: ['new-chat', 'profile'],
  },
  {
    id: 'voice-call',
    keys: ['voice call', 'audio call', 'call karo', 'phone'],
    answer:
      'Personal chat header me Phone icon se voice call. Call screen par timer, mute, screen share aur End. Block hone par "You blocked this contact" toast aur call nahi hoti. Peer offline ho to 45 sec baad "No answer" + missed notification.',
    extra:
      'Call start karne ke liye microphone permission zaroori hai. Voice call me bhi screen share kaam karta hai (remote ko video dikhta hai).',
    related: ['video-call', 'missed-calls', 'incoming'],
  },
  {
    id: 'video-call',
    keys: ['video call', 'camera call', 'video'],
    answer:
      'Header me Video icon se video call. Poori screen par remote video, corner me chhoti self-view (mirrored), niche dock: Mute, Camera switch, ✨ Filters, Share, End. Local camera/audio track 640x480 ~24fps par limited hai (latency ke liye).',
    extra:
      'Camera switch device enumerate karke doosra camera dhundhta hai; sirf ek ho to "Only one camera available" notice. Filters dono taraf sync hote hain.',
    related: ['call-controls', 'filters', 'screen-share'],
  },
  {
    id: 'incoming',
    keys: ['incoming', 'ringing', 'answer', 'decline', 'ringtone', 'animation'],
    answer:
      'Incoming call par full-screen green gradient, rippling avatar animation, "Incoming voice/video call..." pulsing text, aur Answer (green) / Decline (red) buttons. Ringtone bajta hai aur screen wake-lock on hoti hai. Decline par missed entry + notification.',
    extra:
      'Agar app background me ho to system notification bhi aati hai — usme Answer aur Decline actions hote hain. Busy hone par "User is busy" notice aati hai.',
    related: ['minimize-call', 'missed-calls'],
  },
  {
    id: 'call-controls',
    keys: ['call controls', 'mute call', 'camera switch', 'end call', 'dock', 'calls', 'call'],
    answer:
      'Call ke niche ek glass dock: Mic/MicOff (Mute/Unmute), Switch camera (sirf video), ✨ Filters (sirf video), Screen share (Share/Stop share), aur red End. Har button ke niche chhota label likha hai. Screen share par camera/filter buttons hat jate hain.',
    extra:
      'Mute track ko disable karta hai (mic band), removed nahi. End call dono taraf signal bhej kar connection band karta hai aur history update karta hai.',
    related: ['video-call', 'screen-share', 'filters'],
  },
  {
    id: 'screen-share',
    keys: ['screen share', 'share screen', 'display', 'screen'],
    answer:
      'Dock me Share dabao → browser ka screen picker → screen/window/tab chuno → share shuru. Voice aur video dono calls me kaam karta hai. Remote ko video dikhta hai, aapko apni screen preview me. "Stop share" ya browser ke Stop sharing se band hota hai.',
    extra:
      'Share ke time video mirror nahi hota (text seedha rehta hai) aur fun filter auto band ho jata hai. WebRTC renegotiation ke saath track replace hota hai — browser support zaroori hai.',
    related: ['video-call', 'filters', 'call-controls'],
  },
  {
    id: 'filters',
    keys: ['filter', 'fun filter', 'glow', 'retro', 'mono', 'dreamy', 'neon', 'noir', 'sparkles'],
    answer:
      'Video call me dock ka ✨ Filters se 7 options: Original, Glow, Retro, Mono, Dreamy, Neon, Noir. Har chip ke upar chhota preview circle hota hai. Filter aapki self-view aur doosre ki video dono par lagta hai (signal se sync). Escape ya X se panel band.',
    extra:
      'Filter panel agle call me khula nahi rehta (call badalte hi reset). Screen share shuru karte hi filter hat jata hai.',
    related: ['video-call', 'screen-share'],
  },
  {
    id: 'minimize-call',
    keys: ['minimize', 'call notification', 'back during call', 'restore call', 'ongoing', 'call banner'],
    answer: `Call ko chhupa kar app me ghoomne ke liye:
• Call ke time Back dabao ya upar "Minimize" button.
• Call chhoti top banner me badal jati hai (naam, Calling/In call, timer, Open, End).
• Saath hi persistent system notification "Calling… / In call with…" dikhti hai.
• Banner ya notification pe tap → full call screen wapas; media dobara connect hota hai.
Call khatam hone par banner aur notification dono apne aap hat jate hain.`,
    extra:
      'Call ke time Back pehli baar minimize karta hai, app se bahar nahi jata. Screen wake-lock call tak active rehti hai. Page kill hone par stale notification boot par clear ho jati hai.',
    related: ['incoming', 'missed-calls', 'shortcuts'],
  },
  {
    id: 'missed-calls',
    keys: ['missed call', 'callback', 'no answer', 'call history', 'calls tab'],
    answer:
      'Missed/incoming call ki notification me "Call back" aur "Message" actions hote hain. 45 sec na uthane par "No answer" notification. Calls tab me poori history (direction, video/voice icon, duration, date groups Today/Yesterday) dikhti hai.',
    extra:
      'History entry ko long-press/right-click se Remove kar sakte ho. "Start a call" se contact picker khulta hai, phir "Start a voice call?" confirm dialog.',
    related: ['voice-call', 'calls-panel'],
  },
  {
    id: 'calls-panel',
    keys: ['calls panel', 'call list', 'start a call', 'remove history'],
    answer:
      'Bottom tab "Calls": upar history list, neeche "Start a call" button. Button dabao → contacts picker → contact chuno → "Start a voice call?" dialog → Cancel/Call. Har history row par long-press ya right-click → Remove menu.',
    extra:
      'History local storage me (cw-calls:<userId>) 100 entries tak save hoti hai. ✅ voicecall, 🎥 video call, ❌ missed icons dikhte hain.',
    related: ['missed-calls', 'voice-call'],
  },
  {
    id: 'status',
    keys: ['status', 'story', 'status add', 'new status', 'my status'],
    answer: `Bottom tab "Status":
• "My status" me text (180 chars, 6 background colors) ya image (<15 MB) add.
• "Recent updates" me doosron ke status; 4 sec (text) / 5 sec (image) auto-advance, progress bars.
• Tap karke aage/pichhe, screen ke aadhe hisse se navigation, ‹ › buttons.
• Apne status par view count aur "Delete status" option.
Status 24 ghante baad expire ho jate hain.`,
    extra:
      'Naye status par "New status" badge dikhta hai. Text status ke liye background color picker hai; image crop nahi hota, object-cover dikhti hai.',
    related: ['community', 'calls-panel'],
  },
  {
    id: 'community',
    keys: ['community', 'communities', 'community tab'],
    answer:
      'Bottom tab "Community" aapke groups dikhati hai (sidhi chat se group list). Upar "Communities" heading aur "New group" button. Koi group na ho to "No communities yet" + "Create a group" empty state. Group pe tap → us chat me open.',
    extra:
      'Community alag data nahi rakhti — sirf existing group chats ka view hai. Group banane ke liye New group modal khulta hai.',
    related: ['new-group', 'group-members'],
  },
  {
    id: 'profile',
    keys: ['profile', 'edit profile', 'name', 'username', 'avatar', 'bio', 'color'],
    answer: `Profile tab (Sidebar ⋮ → Profile):
• Photo: <2 MB, "Remove" se hata sakte ho.
• Name: max 40 chars; Bio: max 140 + counter.
• Username: 3-20 chars (letters, numbers, . ya _), live availability check (Checking / Available / Taken).
• 8 avatar colors.
• Edit profile → save → success toast; failure par modal band nahi hota.
• QR code button se apna QR dikhte ho.`,
    extra:
      'Save ke baad hi modal band hota hai — pehle nahi. Username unique nahi ho to "That username is already taken" error dikhta hai aur modal khula rehta hai.',
    related: ['qr', 'settings'],
  },
  {
    id: 'settings',
    keys: ['settings', 'preferences', 'toggle', 'setting'],
    answer: `Settings tab me ye saare rows hain:
1. Show my QR code (Open)
2. Screen lock (sirf mobile par)
3. Light theme
4. Push notifications
5. Notification sounds
6. Desktop notifications
7. Read receipts
8. Haptic feedback
9. Reduce motion
10. Help & AI
Neeche "Signed in as <email>", "ChatWave - v2.0" aur Log out button. Preferences is device par auto save hote hain.`,
    extra:
      'Har row ka toggle details neeche diye gaye topics me milta hai — jaise "screen lock", "theme", "push", "haptics". Koi bhi poocho.',
    related: ['screen-lock', 'theme', 'notifications-settings', 'help'],
  },
  {
    id: 'screen-lock',
    keys: ['screen lock', 'app lock', 'pin', 'lock', 'forgot pin'],
    answer:
      'Settings → Screen lock (mobile-only). Set a PIN → Confirm PIN. App kholne par 4-digit PIN maangta hai. "Disable screen lock" ke liye PIN dena padta hai. "Forgot PIN?" → warning ("This clears the PIN and signs you out…") → Reset/Cancel. Ye UI-level lock hai.',
    extra:
      'Galat PIN par shake animation aur "Wrong PIN" dikhta hai. PIN local storage me hota hai — device security ke liye OS lock bhi use karo.',
    related: ['settings', 'login'],
  },
  {
    id: 'theme',
    keys: ['theme', 'light', 'dark', 'reduce motion', 'color'],
    answer:
      'Settings → Light theme toggle se dark/light appearance badalti hai (default dark). Reduce motion toggle animations aur transitions chhota kar deta hai. Dono choice localStorage me save hote hain. Login screen par bhi theme toggle hai.',
    extra:
      'Theme preference per-browser hai — doosre device par alag ho sakta hai. Reduce motion system preference se bhi already support hai.',
    related: ['settings', 'profile'],
  },
  {
    id: 'notifications-settings',
    keys: ['push', 'desktop notification', 'notification sound', 'read receipts', 'haptics', 'vibrate'],
    answer: `Settings me notification-related sab:
• Push notifications — app band ho to bhi alerts (sirf PROD + installed PWA + permission me kaam karta hai).
• Notification sounds — nayi message par sound.
• Desktop notifications — tab hidden par browser alert.
• Read receipts — doosre ko pata chale aapne padha.
• Haptic feedback — swipe-to-reply aur long-press par vibration.
• Mute notifications — poori app ki sound band (Sidebar ⋮ se bhi).`,
    extra:
      'Important: per-chat mute sirf sound band karta hai — desktop/push notifications phir bhi aa sakte hain. Push enable karne par browser permission prompt aata hai.',
    related: ['mute', 'settings'],
  },
  {
    id: 'install',
    keys: ['install', 'pwa', 'home screen', 'offline'],
    answer: `Install prompt AuthScreen me "Install ChatWave · quick access" ke saath aata hai: Install ya X (dismiss). Chhupne par browser menu se "Install app / Add to Home screen". Keyboard khula ho to install prompt chhup jata hai.
Install hone par app standalone chalti hai aur service worker offline shell cache karta hai.`,
    extra:
      'Push notifications ke liye installed PWA + notification permission zaroori hai. Service worker versioned cache (chatwave-v5) use karta hai.',
    related: ['notifications-settings', 'login'],
  },
  {
    id: 'login',
    keys: ['login', 'signup', 'sign in', 'sign up', 'account', 'terms', 'username check', 'password'],
    answer: `AuthScreen 3-step signup:
1. Account — email + password (strength chips + Eye/EyeOff show password).
2. Username — live availability (Checking / Available / Taken).
3. Security — Terms & Conditions checkbox (6 terms modal me khulta hai).
Step dots upar, "Previous step" neeche. Sign me email confirmation notice dikhta hai. "built by Shivam Kumar" footer me.`,
    extra:
      'Username unique hona chahiye. Email verify hone par hi full access milta hai (provider ke hisaab se). Sign out Sidebar ⋮ menu se.',
    related: ['profile', 'install'],
  },
  {
    id: 'toasts',
    keys: ['toast', 'notice', 'banner', 'success', 'error message'],
    answer:
      'App chhote toast/banner se feedback deta hai: green success (message forwarded ✓, profile updated, wallpaper set), red error (Could not…), aur notice bar (call declined, no answer). 2.8-3.6 sec baad apne aap chale jate hain, "Dismiss" se turant.',
    extra:
      'Browser title me unread count "(N) ChatWave" bhi ek tarah ka notification hai.',
    related: ['settings', 'help'],
  },
  {
    id: 'wallpaper',
    keys: ['wallpaper', 'background', 'custom photo', 'my photo', 'gradient', 'chat background'],
    answer: `Chat ke ⋮ → Chat wallpaper me 11 options:
My Photo, Dots, Midnight, Aurora, Rose, Ocean, Forest, Sunset, Nebula, Grid, Golden.
Koi preset dabao → turant apply + picker band. "My Photo" se apni image upload karo — 1400px tak resize + JPEG compress hoke usi chat me save hoti hai. Dark overlay text readable rakhta hai.`,
    extra:
      'Wallpaper per-chat hoti hai (localStorage cw-wallpaper:<chatId>). Custom photo cw-wallpaper-custom:<chatId> me save hoti hai. Pick karte hi picker band ho jata hai — alag se Save nahi karna padta.',
    related: ['theme', 'messages'],
  },
  {
    id: 'chat-info',
    keys: ['chat info', 'view contact panel', 'shared photos', 'notifications on'],
    answer:
      'Group info / Contact info panel me: bada avatar, naam, members count ya last seen/bio, aur rows — Manage members (group), Notifications on/muted toggle, Shared photos (count), aur mute/settings rows. Panel ke upar close X.',
    extra:
      'ye panel ⋮ → Group info / View contact se bhi khulta hai aur header name click se bhi. Group me Manage members usi GroupMembersModal ko kholta hai.',
    related: ['header', 'group-members', 'mute'],
  },
]

const ALL_FEATURES = `Poori ChatWave — ek-ek karke (default 1 se 55 tak topics main jaanta hoon):

1. Messages: bhejna, emoji, photo/file (5/25 MB), captions, voice note (5 min), drafts, links.
2. Reply (swipe + hover), Edit, Delete (for me/everyone), Copy, Forward (single + bulk).
3. Reactions (6 + double-tap ❤️), Star, Pin message bar, Multi-select, Search, Message info, Export chat.
4. Disappearing messages (Off / 24 hours / After viewing).
5. Chats: New chat, New group, QR scan, pin/archive/mute, mark read/unread, block, clear chat.
6. Sidebar tabs: All, Unread, Favorites, Groups, Archived.
7. Groups: add/remove members, rename, admin transfer, delete/leave group, group members.
8. Calls: voice, video, incoming animation, controls dock, camera switch, 7 filters, screen share, minimize + notification, history, missed calls, callback.
9. Tabs: Chats, Status (text/image, 24h), Community, Calls.
10. Profile & Settings: name/username/avatar/color/bio, QR, screen lock PIN, light theme, push, sounds, desktop notifications, read receipts, haptics, reduce motion, Help & AI.
11. Auth: 3-step signup, terms, username check, password strength, theme.
12. PWA install, offline shell, keyboard shortcuts, back gesture, toasts.
13. Developer: Shivam Kumar — GitHub, LinkedIn, Portfolio, bio aur ChatWave ka 1-week backstory.

Koi bhi upar wale topic ka naam likho — detail se bataunga. "Aur" likhkar pehle jawab ka extended version milta hai.`

const pick = (items) => items[Math.floor(Math.random() * items.length)]

const smallTalk = (query) => {
  if (/\b(hello|hi|hey|namaste|good morning|good afternoon|good evening)\b/.test(query))
    return pick([
      'Namaste! 👋 Main yahin hoon — bataiye, aaj kya janna hai?',
      'Hey! 👋 Mujhe poochhiye jo bhi mann hai — app ho ya general koi topic.',
      'Hello! Main ready hoon. Koi bhi sawaal, koi bhi topic — shuru karein.',
    ])
  if (/\b(thank|thanks|shukriya|dhanyavaad)\b/.test(query))
    return pick([
      'Koi baat nahi! Aur madad chahiye to main yahin hoon.',
      'Welcome! Aapka sawaal achha tha, phir se poochhne me jhijhak mat karein.',
      'Glad to help! Koi aur topic try karein.',
    ])
  if (/\b(how are you|kaise ho|kya haal)\b/.test(query))
    return pick([
      'Main bilkul theek hoon, aur aapki madad ke liye ready!',
      'Sab badhiya! Aap bataiye, kis topic par baat karni hai?',
      'I am good, thanks! Aaj kya seekhna chahte hain?',
    ])
  if (/\b(time|samay|date|tarikh)\b/.test(query)) {
    const now = new Date()
    return pick([
      `Abhi ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })} hai, aur aaj ${now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })} hai.`,
      `Time dekh liya — ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}, ${now.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short' })}.`,
    ])
  }
  if (/\b(joke|mazaak|hasao)\b/.test(query))
    return pick([
      'Suno: Developer ne app 1 week me banayi… aur uske baad poocha, "ab AI bhi bana dete hain?" — main yahin hoon! 😄',
      'Ek chhoti si: Main itna smart hoon ki apna code khud nahi likh sakta… par aapki madad zaroor kar sakta hoon! 😄',
      'Why did the developer go to the coffee shop? To debug his day! ☕😄',
    ])
  return null
}

const replyFor = (text, lastTopic) => {
  const query = ` ${text.toLowerCase().trim().replace(/[^\w@]+/g, ' ')} `
  const small = smallTalk(query)
  if (small) return { text: small, topic: null }
  if (/\b(sab|saare|all|poora|pura|features|ek ek|list|saare|kuch bhi)\b/.test(query)) return { text: ALL_FEATURES, topic: 'features' }
  if (/\b(aur|more|detail|details|further|zyda|zyada)\b/.test(query) && lastTopic) {
    return {
      text: `${lastTopic.answer}\n\nAur detail: ${lastTopic.extra}`,
      topic: lastTopic.id,
    }
  }
  const queryWords = query.split(' ').filter(Boolean)
  let best = null
  let bestScore = 0
  for (const item of KNOWLEDGE) {
    let score = 0
    for (const key of item.keys) {
      const words = key.toLowerCase().split(' ')
      if (query.includes(` ${key.toLowerCase()} `)) score += 12 + words.length * 3
      else if (words.every((word) => queryWords.includes(word))) score += 6 + words.length * 2
      else if (words.length === 1 && queryWords.some((word) => word.startsWith(words[0]))) score += 3
    }
    if (score > bestScore) {
      best = item
      bestScore = score
    }
  }
  if (best) return { text: best.answers ? pick(best.answers) : best.answer, topic: best }
  const suggestions = KNOWLEDGE.slice(0, 4).map((item) => item.keys[0]).join(', ')
  return {
    text: pick([
      `Is topic par abhi itna detail nahi hai — par aap chhoti baat kar sakte ho. ChatWave ke baare me poochhna ho to: ${suggestions}.`,
      `Ye mujhe abhi theek se nahi pata. Koi aur topic try karein, ya app se related kuch poochhein — ${suggestions}.`,
      `Main isme abhi limited hoon. Live Groq AI ke saath aap padhai/news/koi bhi topic freely poochh sakte ho. App ke liye: ${suggestions}.`,
    ]),
    topic: null,
  }
}

const greeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function HelpAIModal({ onClose, screen, detail }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      from: 'bot',
      text: `${greeting()} 👋 Welcome! Main ChatWave AI hoon — aapka in-app assistant. Mujhe is application ki har feature, har button aur har setting ka poora gyaan hai. Aap koi bhi sawaal poochhiye, main jald hi madad karunga.`,
    },
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [liveMode, setLiveMode] = useState(null)
  const [lastTopic, setLastTopic] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [feedback, setFeedback] = useState({})
  const [streamingId, setStreamingId] = useState(null)
  const streamTimer = useRef(null)
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (streamTimer.current) window.clearInterval(streamTimer.current)
    }
  }, [onClose])

  const streamReply = (reply) => {
    const id = `a-${Date.now()}`
    setMessages((prev) => [...prev, { id, from: 'bot', text: '' }])
    setTyping(false)
    setStreamingId(id)
    let index = 0
    if (streamTimer.current) window.clearInterval(streamTimer.current)
    streamTimer.current = window.setInterval(() => {
      index = Math.min(reply.length, index + 5)
      const slice = reply.slice(0, index)
      setMessages((prev) => prev.map((item) => (item.id === id ? { ...item, text: slice } : item)))
      if (index >= reply.length) {
        window.clearInterval(streamTimer.current)
        streamTimer.current = null
        setStreamingId(null)
      }
    }, 14)
  }

  const splitSuggestions = (reply) => {
    const match = reply.match(/\n?SUGGEST:\s*(.+)$/i)
    if (!match) return { text: reply.trim(), chips: [] }
    const chips = match[1]
      .split('|')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 3)
    return { text: reply.slice(0, match.index).trim(), chips }
  }

  const ask = async (text) => {
    const question = text.trim()
    if (!question || typing || streamingId) return
    const history = messages
      .filter((item) => item.id !== 'welcome' && item.text)
      .slice(-12)
      .map((item) => ({ role: item.from === 'me' ? 'user' : 'assistant', content: item.text }))
    setMessages((prev) => [...prev, { id: `q-${Date.now()}`, from: 'me', text: question }])
    setInput('')
    setSuggestions([])
    setTyping(true)
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...history, { role: 'user', content: question }],
          screen,
          detail,
        }),
      })
      if (!response.ok) throw new Error('AI unavailable')
      const data = await response.json()
      if (!data.reply) throw new Error('Empty reply')
      setLiveMode(true)
      const parsed = splitSuggestions(data.reply)
      setSuggestions(parsed.chips)
      streamReply(parsed.text)
    } catch {
      setLiveMode(false)
      const result = replyFor(question, lastTopic)
      const topic = result.topic && typeof result.topic === 'object' ? result.topic : null
      if (topic) setLastTopic(topic)
      const chips = (topic?.related || [])
        .map((id) => KNOWLEDGE.find((item) => item.id === id)?.keys[0])
        .filter(Boolean)
        .slice(0, 3)
      setSuggestions(chips)
      window.setTimeout(() => streamReply(result.text), 380)
    }
  }

  const related = lastTopic?.related || []

  return createPortal(
    <div
      className="animate-fade-in fixed inset-0 z-[145] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="glass-strong animate-pop-in flex max-h-[82vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="ChatWave AI help"
      >
        <div className="flex items-center gap-2.5 border-b border-white/[0.07] px-4 py-3.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-wa-green/15 text-wa-green">
            <Sparkles size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[14px] font-semibold tracking-tight">ChatWave AI</h3>
            <p className="flex items-center gap-1.5 text-[10.5px] text-wa-muted">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  liveMode === false ? 'bg-amber-300' : 'bg-accent-2'
                }`}
              />
              {liveMode === true
                ? 'Groq AI live · app ka har detail'
                : liveMode === false
                  ? 'Offline guide · Everything about ChatWave'
                  : 'Ask Anything About ChatWave App'}
            </p>
            {(screen || detail) && (
              <p className="mt-0.5 truncate text-[10px] text-wa-muted">
                {SCREEN_LABELS[screen] || screen || 'App'}
                {detail ? ` · ${detail}` : ''}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="icon-btn" aria-label="Close AI help">
            <X size={17} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.from === 'me' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 ${
                  message.from === 'me'
                    ? 'rounded-br-md bg-wa-green/20 text-wa-text'
                    : 'rounded-bl-md border border-white/[0.06] bg-white/[0.04] text-wa-text'
                }`}
              >
                {message.from === 'me' ? (
                  <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed">{message.text}</p>
                ) : (
                  <>
                    <AIRichText text={message.text} />
                    {message.id !== 'welcome' && !streamingId && !typing && (
                      <div className="mt-1.5 flex items-center gap-2 border-t border-white/[0.06] pt-1.5">
                        <button
                          type="button"
                          aria-label="Good answer"
                          onClick={() => setFeedback((prev) => ({ ...prev, [message.id]: 'up' }))}
                          className={`rounded-md p-1 transition-colors hover:bg-white/10 ${
                            feedback[message.id] === 'up' ? 'text-wa-green' : 'text-wa-muted'
                          }`}
                        >
                          <ThumbsUp size={12} />
                        </button>
                        <button
                          type="button"
                          aria-label="Bad answer"
                          onClick={() => setFeedback((prev) => ({ ...prev, [message.id]: 'down' }))}
                          className={`rounded-md p-1 transition-colors hover:bg-white/10 ${
                            feedback[message.id] === 'down' ? 'text-red-400' : 'text-wa-muted'
                          }`}
                        >
                          <ThumbsDown size={12} />
                        </button>
                        {feedback[message.id] && (
                          <span className="text-[10px] text-wa-green">Thanks for the feedback!</span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex justify-start">
              <span className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-white/[0.06] bg-white/[0.04] px-3.5 py-3">
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-wa-muted" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-wa-muted" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-wa-muted" />
              </span>
            </div>
          )}
          {suggestions.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-wa-muted">Ask next:</span>
              {suggestions.map((item, index) => (
                <button
                  key={`${item}-${index}`}
                  type="button"
                  onClick={() => ask(item)}
                  className="rounded-full border border-wa-green/25 bg-wa-green/[0.07] px-2.5 py-1.5 text-[11px] text-wa-green transition-colors hover:bg-wa-green/15"
                >
                  {item}
                </button>
              ))}
            </div>
          )}
          {related.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-wa-muted">Related:</span>
              {related.map((id) => {
                const topic = KNOWLEDGE.find((item) => item.id === id)
                if (!topic) return null
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => ask(topic.keys[0])}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10.5px] text-wa-muted transition-colors hover:bg-white/[0.08] hover:text-wa-text"
                  >
                    {topic.keys[0]}
                  </button>
                )
              })}
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            ask(input)
          }}
          className="flex items-center gap-2 border-t border-white/[0.07] p-3"
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask AI"
            className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-[12.5px] outline-none placeholder:text-wa-muted focus:border-wa-green/50"
          />
          <button
            type="submit"
            disabled={!input.trim() || typing || !!streamingId}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-wa-green text-white transition-transform hover:scale-105 disabled:opacity-40"
            aria-label="Send question"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>,
    document.body
  )
}
