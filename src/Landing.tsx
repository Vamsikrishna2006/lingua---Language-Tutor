import { useRef } from "react";
import { ArrowDown, ArrowRight, Headphones, Mic, Sparkles } from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";

export function Landing({ onStart }: { onStart: () => void }) {
  const page = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: page,
    offset: ["start start", "end end"],
  });
  const imageY = useTransform(scrollYProgress, [0, 0.42], [0, 180]);
  const titleY = useTransform(scrollYProgress, [0, 0.28], [0, -90]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.22], [1, 0]);
  const orbX = useTransform(scrollYProgress, [0.18, 0.7], ["-20vw", "55vw"]);
  const orbRotate = useTransform(scrollYProgress, [0.18, 0.7], [-30, 220]);

  return (
    <motion.main
      className="landing"
      ref={page}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      <section className="landing-hero">
        <motion.img
          src="/images/language-landscape.png"
          alt="Sound flowing through an imagined landscape"
          style={{ y: imageY, scale: 1.08 }}
        />
        <div className="landing-veil" />
        <motion.div
          className="landing-title"
          style={{ y: titleY, opacity: titleOpacity }}
        >
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.8 }}
          >
            A VOICE PRACTICE STUDIO
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 55 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.62,
              duration: 1.1,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            Languages live
            <br />
            <em>when you speak.</em>
          </motion.h1>
          <motion.div
            className="landing-intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.05, duration: 1 }}
          >
            <p>
              Lingua helps you move from knowing the words to trusting your
              voice.
            </p>
            <motion.button
              onClick={onStart}
              whileHover={{ x: 7 }}
              whileTap={{ scale: 0.96 }}
            >
              Enter the studio <ArrowRight size={17} />
            </motion.button>
          </motion.div>
        </motion.div>
        <motion.div
          className="scroll-cue"
          animate={{ y: [0, 9, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <ArrowDown size={15} /> SCROLL TO LISTEN
        </motion.div>
      </section>

      <section className="manifesto">
        <motion.div
          className="travelling-orb"
          style={{ x: orbX, rotate: orbRotate }}
        >
          <span>आ</span>
          <span>అ</span>
          <span>あ</span>
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.7 }}
          transition={{ duration: 0.9 }}
        >
          WHAT IS LINGUA?
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 55 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.45 }}
          transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1] }}
        >
          Not another lesson.
          <br />A place to <em>find your rhythm.</em>
        </motion.h2>
        <motion.div
          className="manifesto-copy"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          <span>01</span>
          <p>
            Textbooks teach the rules. Lingua gives you the private, forgiving
            space to use them out loud. Speak naturally, receive one clear
            correction, hear the phrase, and try again.
          </p>
        </motion.div>
      </section>

      <section className="purpose-section">
        <div className="purpose-heading">
          <p>WHAT IS IT FOR?</p>
          <h2>
            Practice that meets you
            <br />
            between thought and speech.
          </h2>
        </div>
        <div className="purpose-list">
          {[
            {
              icon: <Mic />,
              number: "01",
              title: "Build speaking courage",
              copy: "Rehearse the sentence before the interview, classroom, journey, or conversation.",
            },
            {
              icon: <Sparkles />,
              number: "02",
              title: "Notice what matters",
              copy: "Get focused grammar and vocabulary guidance without a wall of corrections.",
            },
            {
              icon: <Headphones />,
              number: "03",
              title: "Hear the difference",
              copy: "Listen to a natural version, repeat it, and let pronunciation settle into memory.",
            },
          ].map((item, index) => (
            <motion.article
              key={item.number}
              initial={{ opacity: 0, y: 55 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.45 }}
              transition={{ duration: 0.85, delay: index * 0.14 }}
              whileHover={{ y: -10 }}
            >
              <span>{item.number}</span>
              <div>{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="language-current">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          ONE STUDIO. FIVE LIVING TRADITIONS.
        </motion.p>
        <div className="language-marquee">
          <motion.div
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
          >
            <span>ENGLISH</span>
            <i>✦</i>
            <span>हिन्दी</span>
            <i>✦</i>
            <span>తెలుగు</span>
            <i>✦</i>
            <span>日本語</span>
            <i>✦</i>
            <span>संस्कृतम्</span>
            <i>✦</i>
            <span>ENGLISH</span>
            <i>✦</i>
            <span>हिन्दी</span>
            <i>✦</i>
            <span>తెలుగు</span>
            <i>✦</i>
          </motion.div>
        </div>
      </section>

      <section className="landing-finale">
        <motion.div
          initial={{ clipPath: "inset(0 0 100% 0)" }}
          whileInView={{ clipPath: "inset(0 0 0% 0)" }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
        >
          <p>YOUR NEXT SENTENCE IS ENOUGH</p>
          <h2>
            Come as you are.
            <br />
            <em>Leave sounding more like yourself.</em>
          </h2>
          <motion.button
            onClick={onStart}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            Start speaking <ArrowRight />
          </motion.button>
        </motion.div>
      </section>
    </motion.main>
  );
}
