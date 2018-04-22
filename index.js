const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000)
const scene = new THREE.Scene()
const renderer = new THREE.WebGLRenderer({antialias: true})
const raycaster = new THREE.Raycaster()
const ambient = new THREE.AmbientLight(0x888888)
const sun = new THREE.DirectionalLight(0xffffff, 0.5)

let hand, holded, die, dieClock, dieTarget, dieStart
let pieces = []
let click = false
let clickUp = true
let dieAnim = false
let dieAnimTime = 0.4

let dieRots = [
    "there is no zero on the die",
    new THREE.Euler(0, 0, 0),
    new THREE.Euler(0, Math.PI / 2, 0),
    new THREE.Euler(Math.PI / 2, 0, 0),
    new THREE.Euler(Math.PI / -2, 0, 0),
    new THREE.Euler(0, Math.PI / -2, 0),
    new THREE.Euler(0, Math.PI, 0)
]

const init = () => {
    scene.add(ambient)
    sun.position.set(0, 1, 1)
    scene.add(sun)

    let board = new THREE.Mesh(new THREE.PlaneGeometry(10, 10),
        new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load("board.png")}))

    let table = new THREE.Mesh(new THREE.PlaneGeometry(10, 2),
        new THREE.MeshLambertMaterial({color: 0xcbcbcb}))
    table.position.set(0, -2, -3 * Math.sqrt(3) - 7)
    table.rotation.x = THREE.Math.degToRad(-60)
    scene.add(table)
    
    for(let i = 0; i < 16; i++){
        let piece = new THREE.Object3D()
        piece.name = "piece"

        let mat = new THREE.MeshLambertMaterial({color: 0xd91500})
        switch(Math.floor(i / 4)){
        case 1:
            mat.color = new THREE.Color(0x6c7aff)
            break
        case 2:
            mat.color = new THREE.Color(0xffeb54)
            break
        case 3:
            mat.color = new THREE.Color(0x00cb45)
            break
        }
        piece.color = mat.color //new property used when raycasting
        
        let pHead = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), mat)
        let pTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.3, 0.6, 16), mat)
        pHead.position.y = 0.8
        pTorso.position.y = 0.3
        piece.add(pHead)
        piece.add(pTorso)
        piece.rotation.x = THREE.Math.degToRad(30)
        piece.position.set(i * 0.6 - 4.5, -2, -3 * Math.sqrt(3) - 7)
        scene.add(piece)
        pieces.push(piece)
    }

    //put pieces into their starting pos
    /*
    pieces[0].position.set(-3.7, -3, -10.4)
    pieces[1].position.set(-3, -3, -10.5)
    pieces[2].position.set(-3.7, -3.3, -10)
    pieces[3].position.set(-3, -3.3, -9.9)
    */
    
    board.position.set(0, -5, -7)
    board.rotation.x = THREE.Math.degToRad(-60)
    scene.add(board)

    let dieFaceMat = [
        new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load("die5.png")}),
        new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load("die2.png")}),
        new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load("die3.png")}),
        new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load("die4.png")}),
        new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load("die1.png")}),
        new THREE.MeshLambertMaterial({map: new THREE.TextureLoader().load("die6.png")})
    ]
    die = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), dieFaceMat)
    die.position.set(0, 3, -10)
    die.name = "die"
    scene.add(die)

    
    let handModel = new THREE.Mesh(new THREE.SphereGeometry(0.2),
        new THREE.MeshBasicMaterial({color: "magenta"}))
    handModel.position.z = 0.5
    hand = new THREE.Object3D()
    hand.add(handModel)
    hand.position.z = -7
    scene.add(hand)


    scene.background = new THREE.Color(0x78b9de)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.vr.enabled = true
    renderer.vr.userHeight = 0
    document.body.appendChild(renderer.domElement)

    //window.addEventListener("vrdisplaypointerrestricted")

    document.body.appendChild(WEBVR.createButton(renderer))
}

const startDieAnim = (target) => {
    dieAnim = true
    dieClock = new THREE.Clock()
    dieClock.start()
    dieStart = die.quaternion.clone()
    dieTarget = target
}

const animate = () => {
    //loop()
    renderer.animate(loop)
}
const loop = () => {
    const gamepads = navigator.getGamepads()
    let pressed = false
    for(const g of gamepads){
        if(g == null) continue
        for(const b of g.buttons){
            if(b.pressed){
                pressed = true
                if(clickUp){
                    click = true
                    clickUp = false
                }
            }
        }
    }
    if(!pressed) clickUp = true

    if(holded){
        holded.position.copy(hand.position)
        //holded.position.z = 2
        if(click){
            //holded.position.z = 0
            holded = null
            hand.visible = true
            console.log("stop")
            click = false
        }
    }

    //die animation
    if(dieAnim){
        let et = dieClock.getElapsedTime()
        if (et > dieAnimTime){
            die.quaternion.copy(dieTarget)
            die.position.y = 3
            dieAnim = false
            dieClock.stop()
        }
        else{
            THREE.Quaternion.slerp(dieStart, dieTarget, die.quaternion, et / dieAnimTime)
            die.position.y = 3 + Math.sin(Math.PI * 2 * et / dieAnimTime)
        }
    }

    raycaster.setFromCamera({x: 0, y: 0}, camera)
    let objects = scene.children
    if(!holded){
        for(const i of pieces){
            objects = objects.concat(i.children)
            for(const c of i.children){
                c.material.color = i.color
            }
        }
    }
    let intersects = raycaster.intersectObjects(objects)
    if(intersects.length > 0){
        hand.position.copy(intersects[0].point)
        for(const i of intersects){
            if(i.object.name == "die" && !holded && click && !dieAnim){
                let rand = Math.ceil(Math.random() * 6)
                let target = new THREE.Quaternion()
                target.setFromEuler(dieRots[rand])
                startDieAnim(target)
                console.log(rand)
            }
            if(i.object.parent.name == "piece"){
                if(click){
                    holded = i.object.parent
                    hand.visible = false
                    console.log("start")
                }
                for(const c of i.object.parent.children){
                    c.material.color = new THREE.Color(0xffffff)
                }
                break //highlight only the first piece hit by the ray
            }
        }
    }

    click = false
    renderer.render(scene, camera)
}

init()
animate()