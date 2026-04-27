# ClearCord Smoke Test Checklist

Use this checklist after pressing `F5` in Visual Studio or after running the app locally.

## Startup

- Open `https://localhost:7187`
- Confirm the React client loads instead of raw JSON
- Confirm the app restores the previous session if a JWT already exists

## Authentication

- Register a new account
- Sign in with email or username
- Open `Reset access`, generate a reset token, and complete a password reset
- Sign out and sign back in

## Profile

- Update display name and bio
- Upload an avatar image
- Open another user's profile from chat or friends

## Friends

- Search for a second user
- Send a friend request
- Accept or reject the request from the receiving account
- Confirm the friends list refreshes and profile viewing works
- Unfriend the user

## Servers and Channels

- Create a server
- Copy the invite code and join from another account
- Create and edit categories
- Create text and voice channels
- Edit and delete channels
- Leave the server as a non-owner
- Delete the server as the owner

## Chat and Messages

- Open a text channel and confirm history loads
- Send a realtime message through SignalR
- Reply to a message
- Edit and delete a message
- Add and remove emoji reactions
- Pin and unpin a message
- Confirm typing indicators appear for another account

## Attachments

- Upload an image attachment
- Upload a document attachment
- Confirm the image previews inline in chat
- Confirm the document renders as a downloadable link

## Notifications

- Receive a message notification
- Receive a friend request notification
- Receive a server event notification
- Click each notification and confirm the app routes to the related area
- Mark one notification as read
- Mark all notifications as read

## Admin and Roles

- Create a role with permissions
- Assign the role to a member
- Kick a member
- Ban a member
- Confirm admin confirmation dialogs open instead of browser `prompt()` or `confirm()`

## Voice and Video

- Open the calls panel from a voice channel
- Confirm the voice workspace renders with join, mute, camera, and screen-share controls
- Join a call and grant browser permissions when prompted
- Confirm participant tracking updates for a second account

## Notes

- Message attachments are uploaded through the REST API and then broadcast back into the active channel feed.
- SignalR uses channel-based groups and the `messageCreated` event.
- WebRTC support in this project focuses on signaling and peer connection orchestration.
