# cs-crawler

- 2d top-down dungeon crawler
- pixi.js rendering
- multiplayer

# To run locally:
- pull code
- `npm i`
- `npm run dev`
- open [http://localhost:5173](http://localhost:5173)
- (more browser tabs in incognito to simulate multiple players connecting)

# Controls
- `click` to move
- `mouse wheel` to cycle through weapons (temp)
- `alt` + `mouse wheel` to cycle through armors (temp)
- `tab` to toggle minimap between center overlay and top-right
- `b` to toggle inventory
- `n` to generate and pick up a random item (temp)
- `m` to completely fill inventory and bags with generated items (temp)
- `,` to clear inventory and bags (temp)
- `g` to generate 9 random items on the ground around you
- `h` to remove all items from the ground
- click an item on the ground to pick it up
- to toggle debug mode, open `/shared/constants.js` and change `DEBUG` to true or false