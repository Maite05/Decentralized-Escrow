import { Router } from "express" ;
import { prisma } from "../lib prisma.js"

const router = Router();

router .get ("/:wallet" , async (req.res, next) => {
    try { 
        const wallet = req.params.wallet.toLoweCase();

        const user =await prisma.userfindUnique({
            where: {walletAddress: wallet },
        })

        if (!user){
            return res.json ({projects: []});
        }

        const project
    }
}

)