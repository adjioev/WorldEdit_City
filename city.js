// $Id$
/*
* City generator CraftScript for WorldEdit
* (parts of this is based on WorldEdit's sample Maze generator)
* Copyright (C) 2011 echurch <http://www.virtualchurchill.com>
*
* This program is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program. If not, see <http://www.gnu.org/licenses/>.

* Issues (search for !BUG!)
If you get a timeout error when running this script, open 
"plugins/worldedit/config.yml" and change "timeout" 
value (should be under "Scripting") to 10000 or larger
Basement doors don't "place" correctly
Manhole ladders don't "place" correctly
Need to have the height of the block based on the legal height allowed
by Minecraft given the player's location

* Potential Upcoming Improvements
phase 1
place manholes for plumbing
add street lines
add trees to parks
fix up phase to add trees (and eventually doors and ladders)
record as things get created, then call tree creation after transcription
FixupTree(blockX, blockY, blockZ, typeoftree)

phase 2
add args for parkinglots
rework the building/park/etc. resize and placement logic
add parking garage under 2x2 or larger
improve fountain (rounder and scale it up if the park is bigger, maybe)
add "government" buildings with lots of columns
figure out doors and ladders (add them to buildings, stairs and access manholes)
improve fixup phase to add setSmartBlock support
FixupDoor(blockX, blockY, blockZ, orentation)
FixupLadder(blockX, blockY, blockZ, orentation)

phase 3
add arg option for neighborhood, ponds and canals
layout houses 4 lots to a city square
house should centered in fenced lot
single story with more colors
they should have driveways and garages
add roof overhang and better colored roofs (colored wool)
reduce the width/depth of the the building floors has they get taller
better colored walls using wool (mind you now less fire proof)
regular (and existing random) windows in buildings
add parks with ponds (nearly filling them)
canals on the N, S, E or W sides (or combinations of the four)

* Ponder
how do I exit this script if there is a request for help?
Interior room generator? 
Is there a way to speed up the transcription pass?

* Fixed
Place manholes in parks
Arg options for emptylots, parks, parkinglots, streets only, towns (short) and cities (tall)
Add some lights to the reservoirs
Remove all doors and ladders for now, not really a fix more of an avoiding
Wooden floors with accent only in building's walls
Parks with underground water reservoirs 
Skylights on roofs
Support 3x3, 3x2, 2x3, 3x1, 1x3, 2x2, 2x1 and 1x2 buildings
Pyramid, needle or tented roofs for buildings
Simple park with fountain
Stairwells in basement 
Add guardrails to stairs
Thicker streets (allows for roadlines and manholes)
Need to lower the ratio of gold/diamonds in the sewer and plumbing levels
Get rid of the "make a region first" requirement
Sewer treasure encroaches onto the plumbing level
Need to narrow the sidewalks 
Add sandstone accent for wood structures 
Stairs (down into the basement, up to roof) 
Streetlights 
Manholes w/ladders down to the sewer (be the "focal" point)

* Answered
How do I increase the duration of script execution? - plugins/worldedit/config.yml
Should there be support for smaller blocks 2x2 instead of 3x3? - NO

* Left to player(s)
Plumbing level isn't bounded at the city edge 
Air bridges between buildings? 
Should replace outer most sidewalk with grass 
*/

importPackage(Packages.com.sk89q.worldedit);
importPackage(Packages.com.sk89q.worldedit.blocks);
importPackage(Packages.com.sk89q.worldedit.regions);
importPackage(Packages.com.sk89q.worldedit.commands);

// for future reference
var editsess = context.remember();
var session = context.getSession();
var origin = player.getBlockIn();

// some pseudo-constants
var squareBlocks = 15;
var plumbingHeight = 4;
var sewerHeight = 3;
var streetHeight = 2;
var floorHeight = 4;
var roofHeight = 1; // extra bit for roof fluff like railings

// derived pseudo-constants
var belowGround = plumbingHeight + sewerHeight + streetHeight - 1;
var cornerBlocks = squareBlocks / 3;
var sewerFloor = plumbingHeight;
var sewerCeiling = sewerFloor + sewerHeight - 1;
var streetLevel = sewerCeiling + streetHeight - 1;

// how tall are things?
var cityFloorCount = 10;
var townFloorCount = 3;

// what do you want to create
var helpString = "[HELP | CITY | TOWN | PARK | EMPTYLOT | PARKINGLOT | STREETS]"
context.checkArgs(0, -1, helpString);
var modeCreate;
var createMode = { "city": 0, "town": 1, "park": 2, "dirtlot": 3, "parkinglot": 4, "emptylot": 5, "help": -1 };
var modeArg = argv.length > 1 ? argv[1] : "CITY";

// look for longest params first
if (/PARKINGLOT/i.test(modeArg))
    modeCreate = createMode.parkinglot
else if (/EMPTYLOT/i.test(modeArg))
    modeCreate = createMode.emptylot;
else if (/DIRTLOT/i.test(modeArg))
    modeCreate = createMode.dirtlot
else if (/CITY/i.test(modeArg))
    modeCreate = createMode.city
else if (/TOWN/i.test(modeArg))
    modeCreate = createMode.town
else if (/PARK/i.test(modeArg))
    modeCreate = createMode.park

// all else fails let's show some help
else {
    context.print("Usage: " + helpString);
    // how do I exit the script?
}

// how big is everything?
var floorCount = modeCreate == createMode.city ? cityFloorCount : townFloorCount; // short or tall
var squaresWidth = 5;
var squaresLength = 5;

// making room to create
var arrayWidth = squaresWidth * squareBlocks;
var arrayDepth = squaresLength * squareBlocks;
var arrayHeight = belowGround + streetHeight + floorHeight * cityFloorCount + roofHeight;
var blocks = new Array(arrayWidth);
InitializeBlocks();

// add plumbing level (based on Maze.js from WorldEdit)
AddPlumbingLevel();

// add streets
AddStreets();

// add the inside bits
switch (modeCreate) {
    case createMode.city:
    case createMode.town:
        // add sewer, reservoirs, parks and buildings 
        AddCitySquares();
        break;
    case createMode.park:
        AddParkLot();
        break;
    case createMode.dirtlot:
        AddDirtLot();
        break;
    case createMode.parkinglot:
        AddParkingLot();
        break;
    default: // createMode.steets
        AddEmptyLot();
        break;
}

// add access points (will modify the player offset as well)
AddManholes();

// and we are done
TranscribeBlocks(origin);
context.print("fini");

////////////////////////////////////////////////////
// all the details
////////////////////////////////////////////////////

function EncodeBlock(type, data) {
    context.print(type + " " + data);
    return (data << 8) | type;
}

function DecodeType(block) {
    return block & 0xFF;
    //    return block - ((block >> 8) << 8);
}

function DecodeData(block) {
    return block >> 8;
    //    return (block >> 8);
}

function InitializeBlocks() {
    //context.print(arrayWidth + " " + arrayHeight + " " + arrayDepth);
    context.print("Initializing");
    for (var x = 0; x < arrayWidth; x++) {
        blocks[x] = new Array(arrayHeight);
        for (var y = 0; y < arrayHeight; y++) {
            blocks[x][y] = new Array(arrayDepth);
            for (var z = 0; z < arrayDepth; z++)
                blocks[x][y][z] = BlockID.AIR;
        }
    }
}

// etch our array of ints into the "real" world
function TranscribeBlocks(origin) {
    context.print("Transcribing");
    var block;
    for (x = 0; x < arrayWidth; x++)
        for (var y = 0; y < arrayHeight; y++)
            for (var z = 0; z < arrayDepth; z++) {
                //context.print(x + " " + y + " " + z);
                block = blocks[x][y][z];
                editsess.rawSetBlock(origin.add(x, y, z),
                                     new BaseBlock(block & 0xFF, block >> 8));
                //editsess.rawSetBlock(origin.add(x, y - belowGround, z),
                //                     new BaseBlock(blocks[x][y][z]));
                //editsess.smartSetBlock(new Vector(x, y - belowGround, z), new BaseBlock(blocks[x][y][z]));
                //editsess.SetBlock(new Vector(x, y - belowGround, z), new BaseBlock(blocks[x][y][z]));
            }
}

function RandomInt(range) {
    return Math.floor(Math.random() * range);
}

// need to standarize on one param style, these five are not consistent!
function AddWalls(blockID, minX, minY, minZ, maxX, maxY, maxZ) {
    //context.print(minX + "," + minY + "," + minZ + " " + maxX + "," + maxY + "," + maxZ);

    for (var x = minX; x <= maxX; x++)
        for (var y = minY; y <= maxY; y++) {
            blocks[x][y][minZ] = blockID;
            blocks[x][y][maxZ] = blockID;
        }

    for (var y = minY; y <= maxY; y++)
        for (var z = minZ; z <= maxZ; z++) {
            blocks[minX][y][z] = blockID;
            blocks[maxX][y][z] = blockID;
        }
}

function FillCube(blockID, minX, minY, minZ, maxX, maxY, maxZ) {
    for (var x = minX; x <= maxX; x++)
        for (var y = minY; y <= maxY; y++)
            for (var z = minZ; z <= maxZ; z++)
                blocks[x][y][z] = blockID;
}

function FillLayer(blockID, blockX, blockZ, atY, layerW, layerL) {
    for (var x = blockX; x < blockX + layerW; x++)
        for (var z = blockZ; z < blockZ + layerL; z++)
            blocks[x][atY][z] = blockID;
}

function FillCellLayer(blockID, blockX, blockZ, atY, cellW, cellL) {
    FillLayer(blockID, blockX, blockZ, atY, cellW * squareBlocks, cellL * squareBlocks);
}

function FillStrataLevel(blockID, at) {
    FillLayer(blockID, 0, 0, at, arrayWidth, arrayDepth);
}

function AddPlumbingLevel() {
    context.print("Plumbing");

    function id(x, z) {
        return z * (w + 1) + x;
    }

    function $x(i) {
        return i % (w + 1);
    }

    function $z(i) {
        return Math.floor(i / (w + 1));
    }

    function shuffle(arr) {
        var i = arr.length;
        if (i == 0) return false;
        while (--i) {
            var j = RandomInt(i + 1);
            var tempi = arr[i];
            var tempj = arr[j];
            arr[i] = tempj;
            arr[j] = tempi;
        }
    }

    // add some strata
    FillStrataLevel(BlockID.OBSIDIAN, 0);

    // figure out the size
    w = Math.floor(arrayWidth / 2);
    d = Math.floor(arrayDepth / 2);

    var stack = [];
    var visited = {};
    var noWallLeft = new Array(w * d);
    var noWallAbove = new Array(w * d);
    var current = 0;

    stack.push(id(0, 0))

    while (stack.length > 0) {
        var cell = stack.pop();
        var x = $x(cell), z = $z(cell);
        visited[cell] = true;

        var neighbors = []

        if (x > 0) neighbors.push(id(x - 1, z));
        if (x < w - 1) neighbors.push(id(x + 1, z));
        if (z > 0) neighbors.push(id(x, z - 1));
        if (z < d - 1) neighbors.push(id(x, z + 1));

        shuffle(neighbors);

        while (neighbors.length > 0) {
            var neighbor = neighbors.pop();
            var nx = $x(neighbor), nz = $z(neighbor);

            if (visited[neighbor] != true) {
                stack.push(cell);

                if (z == nz) {
                    if (nx < x) {
                        noWallLeft[cell] = true;
                    } else {
                        noWallLeft[neighbor] = true;
                    }
                } else {
                    if (nz < z) {
                        noWallAbove[cell] = true;
                    } else {
                        noWallAbove[neighbor] = true;
                    }
                }

                stack.push(neighbor);
                break;
            }
        }
    }

    for (var z = 0; z < d; z++) {
        for (var x = 0; x < w; x++) {
            var cell = id(x, z);

            if (!noWallLeft[cell] && z < d) {
                blocks[x * 2 + 1][1][z * 2] = BlockID.OBSIDIAN;
                blocks[x * 2 + 1][2][z * 2] = BlockID.OBSIDIAN;
            }
            if (!noWallAbove[cell] && x < w) {
                blocks[x * 2][1][z * 2 + 1] = BlockID.OBSIDIAN;
                blocks[x * 2][2][z * 2 + 1] = BlockID.OBSIDIAN;
            }
            blocks[x * 2 + 1][1][z * 2 + 1] = BlockID.OBSIDIAN;
            blocks[x * 2 + 1][2][z * 2 + 1] = BlockID.OBSIDIAN;

            switch (RandomInt(15)) {
                case 0:
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                case 6:  // 46.7%
                    blocks[x * 2][1][z * 2] = BlockID.WATER;
                    break;
                case 7:
                case 8:  // 13.3%
                    blocks[x * 2][1][z * 2] = BlockID.BROWN_MUSHROOM;
                    break;
                case 9:
                case 10: // 13.3%
                    blocks[x * 2][1][z * 2] = BlockID.RED_MUSHROOM;
                    break;
                case 11: //  6.7%
                    blocks[x * 2][1][z * 2] = BlockID.GOLD_BLOCK;
                    break;
                case 12: //  6.7%
                    blocks[x * 2][1][z * 2] = BlockID.DIAMOND_BLOCK;
                    break;
                default: // 13.3%
                    break;
            }
        }
    }

    // top off the plumbing
    FillStrataLevel(BlockID.CLAY, 3);
}

function DrawParkCell(blockX, blockZ, cellX, cellZ, cellW, cellL) {
    var cornerWidth = squareBlocks / 3;
    var cellWidth = cellW * squareBlocks;
    var cellLength = cellL * squareBlocks;
    //var groundLevel = streetLevel;

    // reservoir's walls
    FillCellLayer(BlockID.SANDSTONE, blockX, blockZ, 0, cellW, cellL);
    AddWalls(BlockID.SANDSTONE, blockX, 1, blockZ,
                                blockX + cellWidth - 1, streetLevel - 1, blockZ + cellLength - 1);

    // fill up reservoir with water
    FillCube(BlockID.WATER, blockX + 1, 1, blockZ + 1,
                            blockX + cellWidth - 2, 4, blockZ + cellLength - 2);

    // pillars to hold things up
    for (var x = cornerWidth; x < cellWidth; x = x + cornerWidth)
        for (var z = cornerWidth; z < cellLength; z = z + cornerWidth)
            for (var y = 1; y < streetLevel; y++)

                // every other column has a lit base
                if (y == 1 && ((x % 2 == 0 && z % 2 == 1) ||
                               (x % 2 == 1 && z % 2 == 0)))
                    blocks[blockX + x][y][blockZ + z] = BlockID.LIGHTSTONE;
                else
                    blocks[blockX + x][y][blockZ + z] = BlockID.SANDSTONE;
            

    // cap it off
    FillCellLayer(BlockID.SANDSTONE, blockX, blockZ, streetLevel, cellW, cellL);

    // add some grass
    FillCellLayer(BlockID.GRASS, blockX, blockZ, streetLevel + 1, cellW, cellL);

    // add an access point to the reservoir
    blocks[blockX + 2][streetLevel + 1][blockZ + 1] = BlockID.AIR; // LOG;
    blocks[blockX + 2][streetLevel    ][blockZ + 1] = BlockID.AIR;
    blocks[blockX + 3][streetLevel - 3][blockZ + 1] = BlockID.SANDSTONE;
    blocks[blockX + 2][streetLevel - 3][blockZ + 1] = BlockID.SANDSTONE;
    blocks[blockX + 1][streetLevel - 3][blockZ + 1] = BlockID.SANDSTONE;

    // add ladders

    // add some fencing
    var fenceHole = 2;
    for (var x = 0; x < cellWidth; x++)
        if (x > fenceHole && x < cellWidth - fenceHole) {
            blocks[blockX + x][streetLevel + 2][blockZ] = BlockID.FENCE;
            blocks[blockX + x][streetLevel + 2][blockZ + cellLength - 1] = BlockID.FENCE;
        }
    for (var z = 0; z < cellLength; z++)
        if (z > fenceHole && z < cellLength - fenceHole) {
            blocks[blockX][streetLevel + 2][blockZ + z] = BlockID.FENCE;
            blocks[blockX + cellWidth - 1][streetLevel + 2][blockZ + z] = BlockID.FENCE;
        }

    // add a fountain
    var fountainDiameter = 5;
    var fountainX = blockX + Math.floor((cellWidth - fountainDiameter) / 2);
    var fountainZ = blockZ + Math.floor((cellLength - fountainDiameter) / 2);

    FillLayer(BlockID.GLASS, fountainX + 1, fountainZ + 1, streetLevel, fountainDiameter - 2, fountainDiameter - 2);
    AddWalls(BlockID.STONE, fountainX, streetLevel + 1, fountainZ,
                            fountainX + fountainDiameter - 1, streetLevel + 2, fountainZ + fountainDiameter - 1);
    FillLayer(BlockID.WATER, fountainX + 1, fountainZ + 1, streetLevel + 1, fountainDiameter - 2, fountainDiameter - 2);

    blocks[fountainX + 2][streetLevel + 1][fountainZ + 2] = BlockID.LIGHTSTONE;
    blocks[fountainX + 2][streetLevel + 2][fountainZ + 2] = BlockID.GLASS;
    blocks[fountainX + 2][streetLevel + 3][fountainZ + 2] = BlockID.GLASS;
    blocks[fountainX + 2][streetLevel + 4][fountainZ + 2] = BlockID.GLASS;
    blocks[fountainX + 2][streetLevel + 5][fountainZ + 2] = BlockID.WATER;
}

function AddCitySquares() {
    context.print("Building");

    // only one park per city square, max. otherwise it just looks weird
    var parkCreated = false;

    // NEED TO REWORK THIS DARN CODE!
    // big building/park support
    var bigW = 3, bigL = 3, bigX = 0, bigZ = 0;
    var cells = new Array(3);
    for (var x = 0; x < 3; x++) {
        cells[x] = new Array(3);
        for (var z = 0; z < 3; z++)
            cells[x][z] = false;
    }

    // figure out how big the big building will be... silly and should be refactored
    do {
        bigW = RandomBuildingSize();
        bigL = RandomBuildingSize();
    } while (bigW == 1 && bigL == 1);

    // where will it fit?
    bigX = RandomInt(4 - bigW);
    bigZ = RandomInt(4 - bigL);

    // mark where it is
    for (var x = bigX; x < bigX + bigW; x++)
        for (var z = bigZ; z < bigZ + bigL; z++)
            cells[x][z] = true;

    // finally actually place it there
    DrawBuildingOrParkCell(bigX + 1, bigZ + 1, bigW, bigL);

    // add basements and building if there isn't one there yet
    for (var x = 0; x < squaresWidth; x++)
        for (var z = 0; z < squaresLength; z++)
            if (!(x % 4 == 0 || z % 4 == 0))
                if (!cells[x - 1][z - 1])
                    DrawBuildingOrParkCell(x, z, 1, 1);

    //======================================================
    //======================================================
    function DrawBuildingCell(blockX, blockZ, cellX, cellZ, cellW, cellL) {
        var cellWidth = cellW * squareBlocks;
        var cellLength = cellL * squareBlocks;

        // a basement
        AddWalls(BlockID.STONE, blockX, sewerFloor, blockZ,
                                blockX + cellWidth - 1, streetLevel, blockZ + cellLength - 1);

        // bottom of the first floor (roof of basement)
        var firstFloor = streetLevel + 1;
        FillCellLayer(BlockID.STONE, blockX, blockZ, firstFloor, cellW, cellL);

        // add some stairs
        PunchStairs(BlockID.COBBLESTONE_STAIRS, blockX + 5, blockZ + 2, firstFloor,
                                                true, true);

        // what color is the walls and floors?
        var wallID = BlockID.BRICK;
        var floorID = BlockID.IRON_ORE;
        switch (RandomInt(5)) {
            case 1:
                wallID = BlockID.IRON_BLOCK;
                floorID = BlockID.IRON_ORE;
                break;
            case 2:
                wallID = BlockID.SAND;
                floorID = BlockID.WOOD;
                break;
            case 3:
                wallID = BlockID.WOOD;
                floorID = BlockID.SANDSTONE;
                break;
            case 4:
                wallID = BlockID.CLAY;
                floorID = BlockID.COBBLESTONE;
                break;
            default:
                break;
        }

        // how many stories and what type of roof?
        var stories = RandomInt(floorCount) + 1;
        var roofStyle = RandomInt(4);
        var roofTop = roofStyle != 0 ? 1 : 0;

        // fix up really short buildings
        if (stories == 1 && roofStyle != 0)
            stories++;

        // build the building
        for (var story = 0; story < (stories - roofTop); story++) {
            var floorAt = story * floorHeight + firstFloor + 1;
            FillFloor(wallID, floorID,
                      blockX + 1, floorAt, blockZ + 1,
                      blockX + cellWidth - 2, floorAt + floorHeight - 2, blockZ + cellLength - 2);

            // add some stairs, but not to the roof
            if (story < (stories - roofTop - 1) || roofStyle < 2)
                PunchStairs(BlockID.WOODEN_STAIRS, blockX + 5, blockZ + 2, floorAt + floorHeight - 1,
                                                   false, true);
        }

        // add the fancy roof if needed
        floorAt = (stories - 1) * floorHeight + firstFloor + 1;
        switch (roofStyle) {
            case 1:
                // NS ridge
                for (r = 0; r < floorHeight; r++)
                    AddWalls(floorID, blockX + 2 + r, floorAt + r, blockZ + 1,
                                      blockX + cellWidth - 3 - r, floorAt + r, blockZ + cellLength - 2);

                // three more to finish things up
                blocks[blockX + 4][floorAt][blockZ + 2] = BlockID.FENCE;
                blocks[blockX + 4][floorAt][blockZ + 3] = BlockID.FENCE;
                blocks[blockX + 4][floorAt][blockZ + 4] = BlockID.FENCE;

                // fill in top with skylight
                FillCube(BlockID.GLASS, blockX + 2 + floorHeight, floorAt + floorHeight - 1, blockZ + 2,
                                        blockX + cellWidth - 3 - floorHeight, floorAt + floorHeight - 1, blockZ + cellLength - 3);
                break;
            case 2:
                // EW ridge
                for (r = 0; r < floorHeight; r++)
                    AddWalls(floorID, blockX + 1, floorAt + r, blockZ + 2 + r,
                                      blockX + cellWidth - 2, floorAt + r, blockZ + cellLength - 3 - r);

                // fill in top with skylight
                FillCube(BlockID.GLASS, blockX + 2, floorAt + floorHeight - 1, blockZ + 2 + floorHeight,
                                        blockX + cellWidth - 3, floorAt + floorHeight - 1, blockZ + cellLength - 3 - floorHeight);
                break;
            case 3:
                // pointy
                for (r = 0; r < floorHeight; r++)
                    AddWalls(floorID, blockX + 2 + r, floorAt + r, blockZ + 2 + r,
                                      blockX + cellWidth - 3 - r, floorAt + r, blockZ + cellLength - 3 - r);

                // fill in top with skylight
                FillCube(BlockID.GLASS, blockX + 2 + floorHeight, floorAt + floorHeight - 1, blockZ + 2 + floorHeight,
                                        blockX + cellWidth - 3 - floorHeight, floorAt + floorHeight - 1, blockZ + cellLength - 3 - floorHeight);
                break;
            default:
                // flat roofs can have one more stairs
                PunchStairs(BlockID.WOODEN_STAIRS, blockX + 5, blockZ + 2, floorAt + floorHeight - 1,
                            false, true);

                // now add some more fences
                AddWalls(BlockID.FENCE, blockX + 1, floorAt + floorHeight, blockZ + 1,
                                        blockX + cellWidth - 2, floorAt + floorHeight, blockZ + cellLength - 2);

                // three more to finish things up
                blocks[blockX + 4][floorAt + floorHeight][blockZ + 2] = BlockID.FENCE;
                blocks[blockX + 4][floorAt + floorHeight][blockZ + 3] = BlockID.FENCE;
                blocks[blockX + 4][floorAt + floorHeight][blockZ + 4] = BlockID.FENCE;
                break;
        }

        function FillFloor(wallID, floorID, minX, minY, minZ, maxX, maxY, maxZ) {
            // NS walls
            for (var x = minX; x <= maxX; x++) {
                var sectionID = wallID;
                if (RandomInt(2) == 1 && x != minX & x != maxX)
                    sectionID = BlockID.GLASS;

                for (var y = minY; y <= maxY; y++) {
                    blocks[x][y][minZ] = sectionID;
                    blocks[x][y][maxZ] = sectionID;
                }
            }

            // EW walls
            for (var z = minZ; z <= maxZ; z++) {
                var sectionID = wallID;
                if (RandomInt(2) == 1 && z != minZ && z != maxZ)
                    sectionID = BlockID.GLASS;

                for (var y = minY; y <= maxY; y++) {
                    blocks[minX][y][z] = sectionID;
                    blocks[maxX][y][z] = sectionID;
                }
            }

            // draw the ceiling
            AddWalls(floorID, minX, maxY + 1, minZ, maxX, maxY + 1, maxZ);
            FillLayer(BlockID.WOOD, minX + 1, minZ + 1, maxY + 1, maxX - minX - 1, maxZ - minZ - 1);
            //for (var x = minX; x <= maxX; x++)
            //    for (var z = minZ; z <= maxZ; z++)
            //        blocks[x][maxY + 1][z] = floorID;
        }

        function PunchStairs(stairID, blockX, blockZ, floorY, addStairwell, addGuardrail) {

            // how tall are the stairs?
            var stairHeight = floorHeight;
            if (addStairwell)
                stairHeight++;

            // place stairs
            for (airX = blockX; airX < blockX + stairHeight; airX++) {
                for (airZ = blockZ; airZ < blockZ + 2; airZ++) {
                    blocks[airX][floorY][airZ] = BlockID.AIR;
                    blocks[airX][floorY - (stairHeight - (airX - blockX)) + 1][airZ] = stairID
                };

                // make sure we don't fall down the stairs
                if (addGuardrail)
                    blocks[airX][floorY + 1][blockZ + 2] = BlockID.FENCE;
            }

            // create a basement enclosure to protect against the nasties
            if (addStairwell) {
                AddWalls(BlockID.STONE, blockX - 4, sewerFloor, blockZ - 1,
                                        blockX + stairHeight, streetLevel, blockZ + 2);

                // add a light
                blocks[blockX - 4][sewerFloor + 3][blockZ] = BlockID.LIGHTSTONE;

                // and a door 
                // !BUG! - this rarely works correctly
                //blocks[blockX - sewerHeight + 1][sewerFloor + 1][blockZ + 2] = BlockID.WOODEN_DOOR;
                //blocks[blockX - sewerHeight + 1][sewerFloor + 0][blockZ + 2] = BlockID.WOODEN_DOOR;
            }
        }
    }

    function RandomBuildingSize() {
        switch (RandomInt(10)) {
            case 0:
            case 1:
            case 2:
            case 3:
                return 1; // 40%
            case 4:
            case 5:
            case 6:
            case 7:
            case 8:
                return 2; // 50%
            default:
                return 3; // 10%
        }
    }

    function DrawBuildingOrParkCell(cellX, cellZ, cellW, cellL) {
        // little park instead of a building?
        if (RandomInt(4) == 0 && !parkCreated) {
            DrawParkCell(cellX * squareBlocks, cellZ * squareBlocks, cellX, cellZ, cellW, cellL)
            parkCreated = true;
        }

        // fine.. be boring, let's make a building
        else
            DrawBuildingCell(cellX * squareBlocks, cellZ * squareBlocks, cellX, cellZ, cellW, cellL);
    }

}

// streets or bridges over canals
function AddStreets() {
    // add the roads
    for (var x = 0; x < squaresWidth; x++)
        for (var z = 0; z < squaresLength; z++)
            if (x % 4 == 0 || z % 4 == 0)
                DrawStreetCell(x * squareBlocks, z * squareBlocks, x, z);

    //======================================================
    //======================================================
    function DrawStreetCell(blockX, blockZ, cellX, cellZ) {

        // add the sewer corner bits
        DrawSewerPart(blockX + 0 * cornerBlocks, blockZ + 0 * cornerBlocks);
        DrawSewerPart(blockX + 2 * cornerBlocks, blockZ + 0 * cornerBlocks);
        DrawSewerPart(blockX + 0 * cornerBlocks, blockZ + 2 * cornerBlocks);
        DrawSewerPart(blockX + 2 * cornerBlocks, blockZ + 2 * cornerBlocks);

        // add the sewer straight bits
        if (cellX % 4 == 0 && cellZ != 0 && cellZ != squaresLength - 1 && cellZ % 4 != 0) {
            DrawSewerPart(blockX + 0 * cornerBlocks, blockZ + 1 * cornerBlocks);
            DrawSewerPart(blockX + 2 * cornerBlocks, blockZ + 1 * cornerBlocks);
        }
        if (cellZ % 4 == 0 && cellX != 0 && cellX != squaresWidth - 1 && cellX % 4 != 0) {
            DrawSewerPart(blockX + 1 * cornerBlocks, blockZ + 0 * cornerBlocks);
            DrawSewerPart(blockX + 1 * cornerBlocks, blockZ + 2 * cornerBlocks);
        }

        // add the street
        FillCellLayer(BlockID.STONE, blockX, blockZ, streetLevel - 1, 1, 1);
        FillCellLayer(BlockID.STONE, blockX, blockZ, streetLevel, 1, 1);

        // add the sidewalk and streetlights
        var sidewalkY = streetLevel + 1;
        if (cellX % 4 == 0 && cellZ % 4 != 0) {
            DrawSidewalk(blockX + 0 * cornerBlocks, blockZ + 0 * cornerBlocks,
                         blockX + 1 * cornerBlocks - 2, blockZ + 3 * cornerBlocks);
            DrawSidewalk(blockX + 2 * cornerBlocks + 2, blockZ + 0 * cornerBlocks,
                         blockX + 3 * cornerBlocks, blockZ + 3 * cornerBlocks);

            DrawStreetlight(blockX + 0 * cornerBlocks + 2, blockZ + 1 * cornerBlocks + 2, true, false, false, false);
            DrawStreetlight(blockX + 2 * cornerBlocks + 2, blockZ + 1 * cornerBlocks + 2, false, false, true, false);
        } else if (cellX % 4 != 0 && cellZ % 4 == 0) {
            DrawSidewalk(blockX + 0 * cornerBlocks, blockZ + 0 * cornerBlocks,
                         blockX + 3 * cornerBlocks, blockZ + 1 * cornerBlocks - 2);
            DrawSidewalk(blockX + 0 * cornerBlocks, blockZ + 2 * cornerBlocks + 2,
                         blockX + 3 * cornerBlocks, blockZ + 3 * cornerBlocks);

            DrawStreetlight(blockX + 1 * cornerBlocks + 2, blockZ + 0 * cornerBlocks + 2, false, true, false, false);
            DrawStreetlight(blockX + 1 * cornerBlocks + 2, blockZ + 2 * cornerBlocks + 2, false, false, false, true);
        } else if (cellX % 4 == 0 && cellZ % 4 == 0) {
            DrawSidewalkCorner(blockX + 0 * cornerBlocks, blockZ + 0 * cornerBlocks, 0, 0);
            DrawSidewalkCorner(blockX + 2 * cornerBlocks, blockZ + 0 * cornerBlocks, 2, 0);
            DrawSidewalkCorner(blockX + 0 * cornerBlocks, blockZ + 2 * cornerBlocks, 0, 2);
            DrawSidewalkCorner(blockX + 2 * cornerBlocks, blockZ + 2 * cornerBlocks, 2, 2);

            DrawStreetlight(blockX + 0 * cornerBlocks + 2, blockZ + 0 * cornerBlocks + 2, true, true, false, false);
            DrawStreetlight(blockX + 2 * cornerBlocks + 2, blockZ + 0 * cornerBlocks + 2, false, true, true, false);
            DrawStreetlight(blockX + 2 * cornerBlocks + 2, blockZ + 2 * cornerBlocks + 2, false, false, true, true);
            DrawStreetlight(blockX + 0 * cornerBlocks + 2, blockZ + 2 * cornerBlocks + 2, true, false, false, true);
        }

        function DrawSewerPart(blockX, blockZ) {
            // first the walls
            var wallID = BlockID.COBBLESTONE;
            if (RandomInt(2) == 0)
                wallID = BlockID.MOSSY_COBBLESTONE;
            AddWalls(wallID, blockX, sewerFloor, blockZ,
                         blockX + cornerBlocks - 1, sewerCeiling, blockZ + cornerBlocks - 1);

            // then the goodies
            var fillID = BlockID.DIRT;
            switch (RandomInt(40)) {
                case 0:
                case 1:
                case 2:
                case 3:  // 10.0%
                    fillID = BlockID.SAND;
                    break;
                case 4:
                case 5:
                case 6:  //  7.5%
                    fillID = BlockID.COAL_ORE;
                    break;
                case 7:
                case 8:
                case 9:  //  7.5%
                    fillID = BlockID.GRAVEL;
                    break;
                case 10:
                case 11: //  5.0%
                    fillID = BlockID.IRON_ORE;
                    break;
                case 12:
                case 13: //  5.0%
                    fillID = BlockID.LAPIS_LAZULI_ORE;
                    break;
                case 14:
                case 15: //  5.0%
                    fillID = BlockID.WATER;
                    break;
                case 16: //  2.5%
                    fillID = BlockID.GOLD_BLOCK;
                    break;
                case 17: //  2.5%
                    fillID = BlockID.LAVA;
                    break;
                default: // 55.0%
                    // everything else gets DIRT
                    break;
            }
            FillCube(fillID, blockX + 1, sewerFloor, blockZ + 1,
                         blockX + cornerBlocks - 2, sewerCeiling, blockZ + cornerBlocks - 2);
        }

        function DrawStreetlight(blockX, blockZ, lightN, lightE, lightS, lightW) {
            blocks[blockX][sidewalkY][blockZ] = BlockID.DOUBLE_STEP;
            blocks[blockX][sidewalkY + 1][blockZ] = BlockID.FENCE;
            blocks[blockX][sidewalkY + 2][blockZ] = BlockID.FENCE;
            blocks[blockX][sidewalkY + 3][blockZ] = BlockID.FENCE;
            blocks[blockX][sidewalkY + 4][blockZ] = BlockID.FENCE;
            blocks[blockX][sidewalkY + 5][blockZ] = BlockID.STEP;

            if (lightN)
                blocks[blockX + 1][sidewalkY + 5][blockZ] = BlockID.LIGHTSTONE;
            if (lightE)
                blocks[blockX][sidewalkY + 5][blockZ + 1] = BlockID.LIGHTSTONE;
            if (lightS)
                blocks[blockX - 1][sidewalkY + 5][blockZ] = BlockID.LIGHTSTONE;
            if (lightW)
                blocks[blockX][sidewalkY + 5][blockZ - 1] = BlockID.LIGHTSTONE;
        }

        function DrawSidewalkCorner(blockX, blockZ, offsetX, offsetZ) {
            for (var x = 0; x < 3; x++)
                for (var z = 0; z < 3; z++)
                    blocks[blockX + offsetX + x][sidewalkY][blockZ + offsetZ + z] = BlockID.STEP;
        }

        function DrawSidewalk(minX, minZ, maxX, maxZ) {
            for (var x = minX; x < maxX; x++)
                for (var z = minZ; z < maxZ; z++)
                    blocks[x][sidewalkY][z] = BlockID.STEP;
        }
    }
}

function AddParkLot() {
    DrawParkCell(squareBlocks, squareBlocks, 1, 1, 3, 3);
}

function AddDirtLot() {
    FillCube(BlockID.DIRT, 1 * squareBlocks, 1, 1 * squareBlocks,
                           4 * squareBlocks - 1, streetLevel, 4 * squareBlocks - 1);
}

function AddParkingLot() {
    FillCube(BlockID.DIRT, 1 * squareBlocks, 1, 1 * squareBlocks,
                           4 * squareBlocks - 1, streetLevel - 1, 4 * squareBlocks - 1);
    FillCube(BlockID.STONE, 1 * squareBlocks, streetLevel, 1 * squareBlocks,
                            4 * squareBlocks - 1, streetLevel, 4 * squareBlocks - 1);
}

function AddEmptyLot() {
    // let see if we can literally do nothing
}

function AddManholes() {
    var manX = 5;
    var manZ = 4;

    // add the manholes
    AddSewerManhole(manX + 0 * squareBlocks, belowGround, manZ + 0 * squareBlocks);
    AddSewerManhole(manX + 0 * squareBlocks, belowGround, manZ + 4 * squareBlocks);
    AddSewerManhole(manX + 4 * squareBlocks, belowGround, manZ + 0 * squareBlocks);
    AddSewerManhole(manX + 4 * squareBlocks, belowGround, manZ + 4 * squareBlocks);

    // offset the start so we are standing on the SE manhole
    origin = origin.add(-manX, -belowGround, -manZ);

    function AddSewerManhole(locX, locY, locZ) {
        blocks[locX][locY - 1][locZ] = BlockID.LOG;

        // !BUG! Manhole ladders don't "place" correctly
        blocks[locX][locY - 2][locZ] = BlockID.AIR; //LADDER;
        blocks[locX][locY - 3][locZ] = BlockID.AIR; //LADDER;
        blocks[locX][locY - 4][locZ] = BlockID.AIR; //LADDER;
        blocks[locX][locY - 5][locZ] = BlockID.AIR; //LADDER;
    }
}