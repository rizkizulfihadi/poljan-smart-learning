import {AnimatePresence, motion} from "framer-motion";

const AnimationWrapper = ({children, keyValue, initial = {opacity: 0}, animate = {opacity: 1}, transition = {duration: 0.8}, classsName}) => {
    return (
        <div>
           <AnimatePresence>
            <motion.div
                    key={keyValue}
                    initial={initial}
                    animate={animate}
                    transition={transition}
                    className={classsName}
                >
                    {children}
                </motion.div>
           </AnimatePresence>
        </div>
    )
}

export default AnimationWrapper;