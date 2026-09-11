"""Run through Blender MCP. Original geometric artwork; existing scenes preserved."""
import bpy, math, json, random
from pathlib import Path
from mathutils import Vector

ROOT=Path('/Users/adamg/Meditation Journey Andersonville')
layout=json.loads((ROOT/'src/layout.json').read_text())
colliders=[]
random.seed(17)
geo=json.loads((ROOT/'src/geography.json').read_text())['results']
origin=next(p['location'] for p in geo if 'Foster' in p['query'])
streets=sorted([{'name':p['query'].split(' and W ')[1],'y':(p['location']['lat']-origin['lat'])*32000,'x':(p['location']['lng']-origin['lng'])*22000} for p in geo if ' and ' in p['query']],key=lambda p:p['y'])
def road(y):
    def slope(j):return (streets[j+1]['x']-streets[j]['x'])/(streets[j+1]['y']-streets[j]['y'])
    def tangent(j):
        if j==0:return slope(0)
        if j==len(streets)-1:return slope(j-1)
        a,b=slope(j-1),slope(j)
        if a*b<=0:return 0
        ha=streets[j]['y']-streets[j-1]['y'];hb=streets[j+1]['y']-streets[j]['y']
        wa,wb=2*hb+ha,hb+2*ha
        return (wa+wb)/(wa/a+wb/b)
    for i,(a,b) in enumerate(zip(streets,streets[1:])):
        if a['y']<=y<=b['y']:
            h=b['y']-a['y'];t=(y-a['y'])/h
            return (2*t**3-3*t*t+1)*a['x']+(t**3-2*t*t+t)*h*tangent(i)+(-2*t**3+3*t*t)*b['x']+(t**3-t*t)*h*tangent(i+1)
    return streets[0 if y<0 else -1]['x']
locations=[('middle-east','MIDDLE EAST BAKERY',5200),('museum','SWEDISH AMERICAN MUSEUM',5211),('bookstore','WOMEN & CHILDREN FIRST',5233),('galleria','ANDERSONVILLE GALLERIA',5247),('gym','CHEETAH GYM',5248),('larson','LOST LARSON',5318),('calo','CALO RISTORANTE',5343),('replay','REPLAY',5358),('heaven','A TASTE OF HEAVEN',5401),('elephant','THE BROWN ELEPHANT',5404),('colectivo','COLECTIVO COFFEE',5425),('lobo','PIZZA LOBO',5457),('tea','ELI TEA BAR',5507),('cip','CHICAGO INTEGRATIVE',5537),('studio','THE COFFEE STUDIO',5628)]
scene=bpy.data.scenes.new('CIP_Sample_'+str(len(bpy.data.scenes)))
if bpy.context.window:
    bpy.context.window.scene=scene
worldcol=bpy.data.collections.new('CIP_World');scene.collection.children.link(worldcol)
materials={};batches={};active=worldcol
def mat(name,hex,emission=0):
    if name in materials:return materials[name]
    rgb=[int(hex[i:i+2],16)/255 for i in (0,2,4)]
    m=bpy.data.materials.new('CIP_'+name);m.diffuse_color=(*rgb,1);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*rgb,1);bs.inputs['Roughness'].default_value=.85
    if emission:bs.inputs['Emission Color'].default_value=(*rgb,1);bs.inputs['Emission Strength'].default_value=emission
    materials[name]=m;return m
palette={'brick':'A35B42','brickLight':'BD7651','brickDark':'784537','stone':'CEB99B','trim':'224A46','navy':'253F50','gold':'E6B865','cream':'F5E4B6','glass':'405E62','window':'E5AC57','roof':'566062','road':'626D74','bikeLane':'5E9E79','pavement':'BAAF97','grout':'9B927F','black':'243333','wood':'98633A','green':'4D793A','leaf':'6D923C','leafLight':'91AD46','leafDark':'355D35','flower':'B77496','red':'C25742','blue':'46718D','yellow':'D5A04A','white':'E8E2CE'}
for n,c in palette.items():mat(n,c,.15 if n=='window' else 0)
def cube(name,loc,size,m,group='world'):
    if group=='world' and name in ['building','treebed','planter','seat','leg','base','welcome board']:
        x,y,z=loc;w,d,h=size
        colliders.append({'name':name,'xMin':x-w/2,'xMax':x+w/2,'yMin':y-d/2,'yMax':y+d/2})
    key=(group,m);v,f=batches.setdefault(key,([],[]));i=len(v);x,y,z=loc;a,b,c=[s/2 for s in size]
    v.extend([(x-a,y-b,z-c),(x+a,y-b,z-c),(x+a,y+b,z-c),(x-a,y+b,z-c),(x-a,y-b,z+c),(x+a,y-b,z+c),(x+a,y+b,z+c),(x-a,y+b,z+c)])
    f.extend([tuple(i+j for j in face) for face in [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]])
def flush(collection):
    for (group,m),(v,f) in batches.items():
        mesh=bpy.data.meshes.new(group+'_'+m);mesh.from_pydata(v,[],f);mesh.materials.append(materials[m]);mesh.update()
        obj=bpy.data.objects.new(group+'_'+m,mesh);collection.objects.link(obj)
    batches.clear()
def text(body,x,y,z,width,side=1,color='cream',size=.6):
    curve=bpy.data.curves.new('lettering','FONT');curve.body=body;curve.align_x='CENTER';curve.align_y='CENTER';curve.size=size;curve.extrude=.003;curve.resolution_u=1
    obj=bpy.data.objects.new('Sign_'+body,curve);active.objects.link(obj);obj.location=(x,y,z);obj.rotation_euler=(math.pi/2,0,-side*math.pi/2);curve.materials.append(materials[color])
    bpy.context.view_layer.update()
    if obj.dimensions.y>width:obj.scale*=width/obj.dimensions.y
def tree(x,y):
    cube('trunk',(x,y,1.7),(.32,.32,3.4),'wood')
    for i in range(29):
        dx,dy,dz=[random.uniform(-1,1) for _ in range(3)]
        if dx*dx+dy*dy+dz*dz>1.3:continue
        cube('leaf',(x+dx*1.7,y+dy*1.7,3.5+dz*1.35),(1.0,1.05,.9),random.choice(['green','leaf','leafLight','leafDark']))
    cube('treebed',(x,y,.13),(1.7,1.7,.25),'stone')
def planter(x,y,side):
    cube('planter',(x,y,.35),(.75,2.2,.7),'wood')
    cube('foliage',(x,y,.78),(.8,2.1,.25),'green')
    for i in range(15):cube('flowers',(x+random.uniform(-.35,.35),y+random.uniform(-1,1),.94),(.16,.17,.16),random.choice(['flower','yellow','white']))
def lamp(x,y):
    cube('lamp',(x,y,2.1),(.12,.12,4.2),'black');cube('base',(x,y,.18),(.4,.4,.35),'black')
    cube('lantern',(x,y,4.15),(.48,.48,.65),'gold');cube('cap',(x,y,4.55),(.64,.64,.15),'black')
    cube('banner',(x,y+.55,3.5),(.06,.85,1.35),'navy')
def bench(x,y):
    for t in [-.2,0,.2]:cube('seat',(x+t,y,.6),(.16,1.8,.12),'wood')
    for t in [.85,1.08]:cube('back',(x+.33,y,t),(.1,1.8,.16),'wood')
    for d in [-.65,.65]:cube('leg',(x,y+d,.3),(.55,.12,.6),'black')

end=streets[-1]['y']
cube('ground',(-4,end/2,-.25),(92,end+180,.4),'green')
# Connected sheared prisms follow the researched centerline exactly. Independent
# axis-aligned one-meter boxes made every road/curb edge look like a staircase.
def ribbon(y0,y1,offset,width,z,height,material):
    v,f=batches.setdefault(('world',material),([],[]));i=len(v)
    for level in [z-height/2,z+height/2]:
        v.extend([(road(y0)+offset-width/2,y0,level),(road(y0)+offset+width/2,y0,level),
                  (road(y1)+offset+width/2,y1,level),(road(y1)+offset-width/2,y1,level)])
    f.extend([tuple(i+j for j in face) for face in [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]])
knots=sorted(set([-90]+[s['y'] for s in streets]+list(range(0,math.ceil(end)))+[end+90]))
for a,b in zip(knots,knots[1:]):
    ribbon(a,b,0,layout['roadHalfWidth']*2,-.015,.1,'road')
    for side in [-1,1]:
        ribbon(a,b,side*layout['bikeCenter'],layout['bikeWidth'],.055,.04,'bikeLane')
        ribbon(a,b,side*(layout['bikeCenter']-layout['bikeWidth']/2),.10,.085,.025,'white')
        ribbon(a,b,side*layout['sidewalkCenter'],layout['sidewalkWidth'],.1,.3,'pavement')
        ribbon(a,b,side*(layout['roadHalfWidth']+.07),.15,.2,.32,'stone')
for i in range(-90,math.ceil(end)+91):
    x=road(i)
    for side in [-1,1]:
        if i%2==0:cube('pavementJoint',(x+side*layout['sidewalkCenter'],i,.26),(layout['sidewalkWidth'],.026,.008),'grout')
    if i%3==0 and all(abs(i-s['y'])>3 for s in streets):
        for side in [-1,1]:ribbon(i-.825,i+.825,side*.18,.08,.05,.025,'yellow')
for s in streets:
    x,y=s['x'],s['y'];cube('cross street',(x,y,.08),(layout['sideStreetReach']*2,layout['crossStreetWidth'],.12),'road')
    for side in [-1,1]:
        for i in range(12):cube('crosswalk',(x-8.6+i*1.55,y+side*4.3,.16),(.85,1.2,.025),'white')
    lamp(x+10.9,y+5.3)
    text(s['name'].replace(' Ave','').upper(),x+10.8,y+5.3,3.35,3.5,1,'cream',.22)

for index,(id,label,address) in enumerate(locations):
    p=next(p['location'] for p in geo if p['query']==f'{address} N Clark St');y=(p['lat']-origin['lat'])*32000;side=1 if address%2 else -1;x=road(y)+side*layout['buildingCenter']
    near=min(abs(y-s['y']) for s in streets);w=13 if id=='cip' else 12 if id=='tea' else max(3.5,min(11,(near-2.5)*2));height=8 if id=='cip' else 7.1 if id=='tea' else 5.6+index%3*.8
    face=x-side*4;trim='navy' if index%3==0 else 'trim';detailed=id in ['cip','tea'];brick='brickLight' if id=='cip' else 'brick'
    cube('building',(x,y,height/2),(8,w,height),brick)
    cube('roof',(x,y,height+.12),(8.4,w+.35,.3),'roof')
    cube('cornice',(face-side*.15,y,height-.22),(.4,w+.4,.28),'stone')
    cube('shopfront',(face-side*.07,y,1.85),(.17,w-.3,3.7),trim)
    # Distinct framed windows and a side entrance. Text remains geometric and original.
    for j in range(3):
        wy=y-w*.30+j*w*.29
        cube('window',(face-side*.18,wy,1.9),(.08,w*.235,2.35),'window' if detailed else 'glass')
        for z in [.65,1.2,2.8]:cube('windowrail',(face-side*.25,wy,z),(.13,w*.245,.12),trim)
        for dy in [-w*.12,w*.12]:cube('windowpost',(face-side*.25,wy+dy,1.85),(.13,.12,2.5),trim)
        if detailed:
            for shelf in [1.05,1.65,2.25]:
                for k in range(7):cube('display',(face-side*.22,wy-w*.1+k*w*.032,shelf),(.10,w*.025,random.uniform(.14,.35)),random.choice(['cream','gold','wood','flower','navy']))
    cube('signboard',(face-side*.2,y,3.55),(.23,w-.2,.83),trim)
    text(label,face-side*.34,y,3.68,w-.6,side,'cream',.54 if detailed else .45)
    text('PSYCHOTHERAPY · 2ND FLOOR' if id=='cip' else 'TEA · COMMUNITY · CHICAGO' if id=='tea' else str(address)+' N. CLARK',face-side*.34,y,3.27,w-.7,side,'gold',.23)
    cube('door',(face-side*.3,y+w*.4,1.4),(.1,w*.13,2.5),trim)
    cube('door glass',(face-side*.37,y+w*.4,1.75),(.07,w*.09,1.55),'glass')
    cube('door handle',(face-side*.43,y+w*.36,1.25),(.09,.06,.24),'gold')
    text(str(address),face-side*.45,y+w*.4,2.9,w*.16,side,'cream',.25)
    for wy in [y-w*.29,y,y+w*.29]:
        cube('upperframe',(face-side*.07,wy,5.2),(.2,w*.21,1.8),'stone')
        cube('upperglass',(face-side*.2,wy,5.2),(.1,w*.17,1.5),'glass')
        cube('uppermullion',(face-side*.28,wy,5.2),(.08,.065,1.5),'stone')
    if detailed:
        # Brick relief is concentrated in the review block.
        for row in range(13):
            for col in range(int(w/.48)):
                by=y-w/2+.24+col*.48+(row%2)*.24
                if by>y+w/2-.15:continue
                z=4.1+row*.26
                if z<6.2 and any(abs(by-wy)<w*.13 for wy in [y-w*.29,y,y+w*.29]):continue
                cube('brick',(face-side*.065,by,z),(.10,.43,.21),random.choice(['brick','brickLight','brickDark']))
        for dy in [-w/2+.8,w/2-.8]:planter(face-side*.6,y+dy,side)
        for dy in [-3,3]:
            cube('light arm',(face-side*.5,y+dy,4.1),(.7,.08,.1),'black');cube('shop lamp',(face-side*.8,y+dy,4.0),(.35,.35,.18),'gold')
        if id=='cip':
            cube('welcome board',(face-side*1.0,y-4.2,.85),(.15,1.25,1.45),'trim')
            text('A LITTLE\nSPACE TO\nBE HERE',face-side*1.1,y-4.2,.95,1.13,side,'cream',.23)
    else:
        # Honest massing for unrevised release art, with recognizable labels.
        cube('awning',(face-side*.55,y,2.9),(1.2,w-.4,.18),trim)
    cube('air unit',(x+.6,y+.3,height+.5),(1.7,1.5,.7),'roof')

for y in range(9,int(end),12):
    if min(abs(y-s['y']) for s in streets)<5:continue
    for side in [-1,1]:
        x=road(y)+side*layout['treeCenter']
        if abs(y-211)<8 and side==1:continue
        tree(x,y);lamp(x,y+4.5)
        if y%3==0:bench(road(y)+side*layout['benchCenter'],y+3)

flush(worldcol)
# Convert text to mesh, then merge by material to minimize static draw calls.
for obj in list(worldcol.objects):
    if obj.type=='FONT':
        bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj;bpy.ops.object.convert(target='MESH')
for m in materials.values():
    objs=[o for o in worldcol.objects if o.type=='MESH' and len(o.data.materials)==1 and o.data.materials[0]==m]
    if len(objs)>1:
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs:o.select_set(True)
        bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join()

out=ROOT/'public/assets';out.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(out/'neighborhood.glb'),export_format='GLB',collection=worldcol.name,export_animations=False,export_extras=True)
(out/'colliders.json').write_text(json.dumps(colliders,separators=(',',':')))

# Small original bicycles for the two directional lanes. Wheels are torus rings;
# the frame and handlebars use chunky pixel-friendly bars.
bikecol=bpy.data.collections.new('CIP_Bicycle');scene.collection.children.link(bikecol)
def bar(a,b,r,material):
    a,b=Vector(a),Vector(b)
    bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=r,depth=(b-a).length,location=(a+b)/2)
    obj=bpy.context.object;obj.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();obj.data.materials.append(materials[material])
    for old in list(obj.users_collection):old.objects.unlink(obj)
    bikecol.objects.link(obj)
for wheel_y in [-.82,.82]:
    bpy.ops.mesh.primitive_torus_add(major_radius=.49,minor_radius=.065,major_segments=16,minor_segments=6,location=(0,wheel_y,.555),rotation=(0,math.pi/2,0))
    wheel=bpy.context.object;wheel.name='Bicycle wheel';wheel.data.materials.append(materials['black'])
    for old in list(wheel.users_collection):old.objects.unlink(wheel)
    bikecol.objects.link(wheel)
    for theta in range(0,360,45):
        t=math.radians(theta);bar((0,wheel_y,.555),(0,wheel_y+math.cos(t)*.47,.555+math.sin(t)*.47),.018,'stone')
rear=(0,.82,.555);front=(0,-.82,.555);crank=(0,.08,.55);saddle=(0,.25,1.18);neck=(0,-.56,1.21)
for a,b in [(rear,crank),(crank,saddle),(saddle,rear),(saddle,neck),(neck,crank),(neck,front)]:bar(a,b,.055,'red')
bar(neck,(0,-.64,1.4),.038,'stone');bar((-.38,-.64,1.4),(.38,-.64,1.4),.045,'black')
cube('bike seat',(0,.25,1.25),(.35,.42,.12),'black','bike')
bar((-.35,.08,.55),(.35,.08,.55),.035,'gold')
cube('rear reflector',(0,.76,.99),(.16,.055,.1),'red','bike')
cube('front reflector',(0,-.68,1.4),(.17,.06,.09),'cream','bike')
mat('riderSkin','CB9269');mat('riderShirt','417B91');mat('riderPants','293C48');mat('helmet','E4B655')
cube('rider torso',(0,.05,1.56),(.55,.38,.60),'riderShirt','rider')
cube('rider head',(0,-.12,2.08),(.57,.51,.52),'riderSkin','rider')
cube('rider helmet',(0,-.10,2.34),(.66,.59,.19),'helmet','rider')
for x in [-.2,0,.2]:cube('helmet vent',(x,-.1,2.445),(.065,.37,.025),'black','rider')
for side in [-1,1]:
    cube('eye',(side*.13,-.385,2.12),(.07,.02,.08),'black','rider')
    shoulder=(side*.31,-.02,1.79);elbow=(side*.36,-.34,1.57);hand=(side*.36,-.64,1.42)
    bar(shoulder,elbow,.10,'riderShirt');bar(elbow,hand,.08,'riderSkin')
    hip=(side*.18,.25,1.28);knee=(side*.23,-.10,.93);foot=(side*.24,.07,.62)
    bar(hip,knee,.12,'riderPants');bar(knee,foot,.10,'riderPants')
    cube('shoe',(side*.24,-.02,.61),(.22,.38,.15),'black','rider')
flush(bikecol)
bpy.ops.export_scene.gltf(filepath=str(out/'bike.glb'),export_format='GLB',collection=bikecol.name,export_animations=False)

for n,c in {'skin0':'D99969','skin1':'AE7753','skin2':'E8B887','skin3':'B98662','hair0':'974326','hair1':'35452A','hair2':'9580A4','hair3':'29262A','shirt0':'C5627A','shirt1':'61794A','shirt2':'E6DBBC','shirt3':'385B70','pants':'2E4148'}.items():mat(n,c)
for index in range(4):
    col=bpy.data.collections.new('CIP_Character_'+str(index));scene.collection.children.link(col)
    cube('torso',(0,0,.97),(.6,.38,.58),'shirt'+str(index),'body')
    cube('head',(0,0,1.58),(.66,.56,.61),'skin'+str(index),'body')
    cube('hair',(0,.025,1.86),(.73,.61,.23),'hair'+str(index),'body')
    cube('backhair',(0,.26,1.68),(.68,.13,.42),'hair'+str(index),'body')
    for side in [-1,1]:
        cube('eye',(side*.16,-.29,1.63),(.085,.03,.095),'black','body')
        cube('ear',(side*.35,0,1.53),(.12,.18,.2),'skin'+str(index),'body')
        cube('arm',(side*.4,0,.97),(.2,.26,.45),'shirt'+str(index),'arms')
        cube('hand',(side*.4,-.015,.72),(.2,.25,.2),'skin'+str(index),'arms')
        cube('leg',(side*.16,0,.39),(.26,.3,.5),'pants','stand')
        cube('shoe',(side*.16,-.08,.13),(.29,.47,.23),'wood','stand')
        cube('crossleg',(side*.22,-.17,.13),(.45,.52,.23),'pants','sit')
    if index==0:
        for i in range(5):cube('hair tuft',(-.28+i*.14,0,2.02+(i%2)*.07),(.14,.4,.15),'hair0','body')
    if index==1:
        cube('cap',(0,-.10,1.98),(.8,.8,.13),'green','body');cube('backpack',(0,.28,1),(.47,.28,.49),'wood','body')
    flush(col)
    bpy.ops.export_scene.gltf(filepath=str(out/f'character-{index}.glb'),export_format='GLB',collection=col.name,export_animations=False)
    col.hide_viewport=True;col.hide_render=True

col=bpy.data.collections.new('CIP_Car');scene.collection.children.link(col)
cube('car',(0,0,.65),(1.45,2.7,.65),'blue');cube('cabin',(0,.08,1.15),(1.25,1.4,.55),'glass');cube('roof',(0,.12,1.49),(1.3,1.5,.14),'blue')
for x in [-.76,.76]:
    for y in [-.86,.86]:cube('wheel',(x,y,.35),(.2,.53,.53),'black')
for x in [-.48,.48]:cube('headlight',(x,-1.37,.7),(.3,.06,.22),'cream')
flush(col);bpy.ops.export_scene.gltf(filepath=str(out/'car.glb'),export_format='GLB',collection=col.name,export_animations=False);col.hide_viewport=True;col.hide_render=True

world=bpy.data.worlds.new('CIP_Daylight');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.48,.7,.85,1);world.node_tree.nodes['Background'].inputs[1].default_value=.8;scene.world=world
sun_data=bpy.data.lights.new('CIP_Sun','SUN');sun_data.energy=2.5;sun=bpy.data.objects.new('CIP_Sun',sun_data);scene.collection.objects.link(sun);sun.rotation_euler=(.45,-.6,-.5)
cam_data=bpy.data.cameras.new('CIP_Review_Camera');cam=bpy.data.objects.new('CIP_Review_Camera',cam_data);scene.collection.objects.link(cam);cam.location=(-28,190,29);target=Vector((7,209,2));cam.rotation_euler=(target-Vector(cam.location)).to_track_quat('-Z','Y').to_euler();cam_data.type='ORTHO';cam_data.ortho_scale=36;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=16;scene.render.resolution_x=1200;scene.render.resolution_y=800;scene.render.resolution_percentage=100
for area in (bpy.context.screen.areas if bpy.context.screen else []):
    if area.type=='VIEW_3D':area.spaces.active.region_3d.view_perspective='CAMERA'
(ROOT/'assets/blender').mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/andersonville-sample.blend'))
result={'scene':scene.name,'world_objects':len(worldcol.objects),'exports':[p.name for p in out.glob('*.glb')],'original_scene_preserved':True}
