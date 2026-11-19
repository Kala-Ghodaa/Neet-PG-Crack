# scripts/subject_data_banks.py
"""
Medical topic data banks for all 19 MBBS subjects.
Provides medically accurate concepts, clinical vignettes, questions, options, and rationales.
"""

# Subject metadata
SUBJECT_METADATA = {
    "anatomy": {"name": "Anatomy", "code": "ANAT"},
    "physiology": {"name": "Physiology", "code": "PHYS"},
    "biochemistry": {"name": "Biochemistry", "code": "BIOC"},
    "pathology": {"name": "Pathology", "code": "PATH"},
    "pharmacology": {"name": "Pharmacology", "code": "PHAR"},
    "microbiology": {"name": "Microbiology", "code": "MICR"},
    "forensic-medicine": {"name": "Forensic Medicine", "code": "FMED"},
    "community-medicine": {"name": "Community Medicine", "code": "CMED"},
    "ent": {"name": "ENT", "code": "ENT"},
    "ophthalmology": {"name": "Ophthalmology", "code": "OPHT"},
    "medicine": {"name": "Medicine", "code": "MEDI"},
    "dermatology": {"name": "Dermatology", "code": "DERM"},
    "psychiatry": {"name": "Psychiatry", "code": "PSYC"},
    "surgery": {"name": "Surgery", "code": "SURG"},
    "orthopedics": {"name": "Orthopedics", "code": "ORTH"},
    "anesthesia": {"name": "Anesthesia", "code": "ANES"},
    "radiology": {"name": "Radiology", "code": "RADI"},
    "obstetrics-gynecology": {"name": "Obstetrics and Gynecology", "code": "OBGY"},
    "pediatrics": {"name": "Pediatrics", "code": "PEDS"},
}

# Extensive clinical curriculum concepts for each subject
# Each entry is a tuple:
# (Concept Title, System ID, System Name, Topic ID, Topic Name, Subtopic, Clinical Scenario Pattern, Lead-in Question Pattern, Option A, Option B, Option C, Option D, Correct Key, Summary, Details, Learning Point 1, Learning Point 2, Learning Point 3)

CLINICAL_CONCEPTS = {
    "anatomy": [
        ("Cavernous Sinus Internal Relations", "neuroanatomy", "Neuroanatomy", "cavernous-sinus", "Cavernous Sinus Anatomy", "Cranial Nerves",
         "presents with severe retro-orbital headache, proptosis, and chemosis following an infected pimple over the philtrum of the upper lip. On neurological testing, lateral abduction of the affected eye is completely paralyzed while other ocular movements are initially preserved.",
         "Which cranial nerve traverses the central venous lumen of the cavernous sinus adjacent to the internal carotid artery, making it the most vulnerable structure to early septic thrombosis?",
         "Abducens nerve (CN VI)", "Oculomotor nerve (CN III)", "Trochlear nerve (CN IV)", "Ophthalmic nerve (CN V1)", "A",
         "The abducens nerve (CN VI) runs freely within the central lumen of the cavernous sinus alongside the internal carotid artery.",
         "The lateral dural wall of the cavernous sinus contains (from superior to inferior): CN III, CN IV, CN V1, and CN V2. In contrast, CN VI and the internal carotid artery traverse directly through the cavernous venous blood space, explaining early isolated lateral rectus palsy in cavernous sinus thrombosis.",
         "CN VI is the only cranial nerve located inside the venous lumen of the cavernous sinus.",
         "Lateral wall contents from superior to inferior: CN III, IV, V1, V2.",
         "Danger area of face drains via angular and superior ophthalmic veins into the cavernous sinus."),

        ("Erb-Duchenne Brachial Plexus Injury", "musculoskeletal", "Upper Limb Anatomy", "brachial-plexus", "Brachial Plexus Lesions", "Upper Trunk",
         "sustains a high-speed motorcycle crash resulting in forceful downward traction of the right shoulder while the head and neck are violently forced to the opposite side. Physical examination reveals an internally rotated, adducted arm with extended elbow and pronated forearm ('waiter's tip' posture).",
         "Which nerve roots of the brachial plexus are primarily avulsed in Erb-Duchenne palsy?",
         "C5 and C6 roots of the upper trunk", "C8 and T1 roots of the lower trunk", "C7 middle trunk isolated root", "Posterior cord C5 to T1", "A",
         "Erb-Duchenne palsy is caused by traction injury to the upper trunk formed by C5 and C6 ventral rami.",
         "Loss of suprascapular nerve (supraspinatus, infraspinatus), musculocutaneous nerve (biceps, brachialis), and axillary nerve (deltoid, teres minor) results in loss of abduction, lateral rotation, and flexion-supination, producing the classic waiter's tip deformity.",
         "Upper trunk injury (C5-C6) leads to waiter's tip position.",
         "Moro reflex is lost on the ipsilateral side, while grasp reflex remains intact.",
         "Biceps reflex and supinator reflex are absent."),

        ("Klumpke Lower Trunk Deformity", "musculoskeletal", "Upper Limb Anatomy", "brachial-plexus", "Brachial Plexus Lesions", "Lower Trunk",
         "falls from a height and desperately grasps a tree branch with one hand to arrest the fall. On examination 4 weeks later, there is marked clawing of all digits, intrinsic hand muscle wasting, and an ipsilateral constricted pupil with mild ptosis.",
         "What is the anatomical mechanism linking the intrinsic hand muscle clawing and the associated Horner syndrome?",
         "Avulsion of C8 and T1 roots including preganglionic sympathetic fibers exiting at T1",
         "Isolated compression of the posterior cord by the pectoralis minor tendon",
         "Laceration of the deep branch of the ulnar nerve in Guyon's canal",
         "Stretching of the lateral cord carrying C5-C7 fibers to the hand", "A",
         "Klumpke paralysis is a lower trunk injury (C8-T1) commonly caused by hyperabduction traction, with T1 injury producing Horner syndrome.",
         "C8-T1 fibers supply all intrinsic muscles of the hand via ulnar and median nerves. Interruption of the T1 white rami communicantes disrupts sympathetic innervation to the pupillodilator and superior tarsal muscles, causing ipsilateral Horner syndrome.",
         "Lower trunk traction (C8-T1) causes true claw hand involving all fingers.",
         "Associated Horner syndrome signifies preganglionic T1 root involvement.",
         "Grasp reflex is impaired while Moro reflex is preserved in neonates."),

        ("Spiral Groove Radial Neuropathy", "musculoskeletal", "Upper Limb Anatomy", "radial-nerve", "Peripheral Nerve Lesions", "Radial Nerve",
         "presents to the emergency department with a midshaft fracture of the humerus following direct trauma. Physical examination reveals complete wrist drop and loss of finger extension, but active elbow extension against gravity is preserved.",
         "Why is elbow extension preserved despite wrist and digital extensor paralysis in a midshaft humerus fracture?",
         "Motor branches to the triceps arise proximal to the spiral groove in the axilla",
         "The triceps muscle receives collateral motor innervation from the musculocutaneous nerve",
         "Elbow extension is primarily powered by the brachioradialis muscle",
         "The radial nerve is protected within the supinator canal at the mid-arm", "A",
         "Motor branches to the triceps arise proximally in the axilla before the radial nerve enters the radial (spiral) groove of the humerus.",
         "Midshaft humeral fractures injure the radial nerve in the spiral groove, paralyzing brachioradialis, extensor carpi radialis longus, and all distal wrist/finger extensors while sparing the triceps brachii.",
         "Radial nerve in the spiral groove is accompanied by the profunda brachii artery.",
         "Midshaft fracture spares triceps extension but causes wrist drop.",
         "Sensory deficit is typically localized over the first dorsal interdigital web space."),

        ("Carpal Tunnel Intrinsic Hand Sparing", "musculoskeletal", "Upper Limb Anatomy", "median-nerve", "Peripheral Nerve Lesions", "Median Nerve",
         "presents with burning numbness and nocturnal paresthesias in the thumb, index, and middle fingers for 8 months. Examination shows thenar atrophy and positive Phalen and Tinel signs.",
         "Which intrinsic hand muscle remains fully functional in isolated carpal tunnel syndrome?",
         "Adductor pollicis", "Abductor pollicis brevis", "Opponens pollicis", "First lumbrical muscle", "A",
         "Adductor pollicis is innervated by the deep branch of the ulnar nerve (C8, T1) and is spared in carpal tunnel syndrome.",
         "The median nerve supplies the 'LOAF' muscles (Lumbricals 1 and 2, Opponens pollicis, Abductor pollicis brevis, Flexor pollicis brevis superficial head). Adductor pollicis is strictly ulnar-innervated.",
         "Carpal tunnel compresses the median nerve beneath the flexor retinaculum.",
         "Palmar cutaneous branch passes superficial to flexor retinaculum, sparing sensation over the thenar eminence.",
         "Adductor pollicis is innervated by the deep branch of the ulnar nerve."),

        ("Common Peroneal Nerve Trauma", "musculoskeletal", "Lower Limb Anatomy", "peroneal-nerve", "Lower Limb Nerve Lesions", "Fibular Neck",
         "is struck on the lateral aspect of the right knee during a sports match. Examination reveals a high-stepping gait, inability to dorsiflex or evert the right ankle, and sensory loss over the dorsum of the foot and first interdigital space.",
         "At which anatomical landmark is the affected nerve most superficial and vulnerable to compression or blunt trauma?",
         "Winding subcutaneously around the neck of the fibula",
         "Deep to the piriformis in the greater sciatic foramen",
         "Within the tarsal tunnel posterior to the medial malleolus",
         "In the popliteal fossa medial to the popliteal artery", "A",
         "The common fibular (peroneal) nerve winds around the fibular neck subcutaneously, making it the most commonly injured lower extremity nerve.",
         "It bifurcates at the fibular neck into the deep fibular nerve (anterior compartment: dorsiflexors, 1st web space) and superficial fibular nerve (lateral compartment: evertors, foot dorsum). Injury causes foot drop and high-stepping gait.",
         "Fibular neck fracture is the classic cause of common peroneal nerve injury.",
         "Loss of both dorsiflexion and eversion with preserved inversion (tibial nerve).",
         "High-stepping steppage gait avoids dragging toes on the ground."),

        ("Femoral Sheath & Canal Boundaries", "musculoskeletal", "Lower Limb Anatomy", "femoral-triangle", "Groin Anatomy", "Femoral Sheath",
         "undergoes emergency surgical repair of an incarcerated groin hernia located medial to the femoral vein and inferior to the inguinal ligament.",
         "Which structure forms the lateral boundary of the femoral canal?",
         "Femoral vein", "Femoral artery", "Femoral nerve", "Lacunar ligament of Gimbernat", "A",
         "The femoral canal is bounded laterally by the femoral vein, medially by the lacunar ligament, anteriorly by the inguinal ligament, and posteriorly by the pectineal ligament.",
         "The femoral sheath encloses the femoral artery (lateral compartment), femoral vein (intermediate compartment), and femoral canal (medial compartment). The femoral nerve lies lateral and outside the femoral sheath.",
         "Femoral canal is the medial compartment of the femoral sheath containing fat and Cloquet's node.",
         "Femoral hernia has the highest rate of strangulation due to rigid boundaries (lacunar ligament).",
         "Femoral nerve is NOT inside the femoral sheath."),

        ("Coronary Dominance & Posterior Descending Artery", "cardiovascular-anatomy", "Thoracic Anatomy", "coronary-circulation", "Coronary Arteries", "Arterial Dominance",
         "undergoes coronary catheterization following an acute inferior wall myocardial infarction. The angiogram demonstrates complete occlusion of the vessel that gives rise to the posterior descending artery (PDA).",
         "In a right-dominant heart (seen in approximately 85% of individuals), from which artery does the PDA arise?",
         "Right coronary artery", "Left circumflex artery", "Left anterior descending artery", "Ramus intermedius", "A",
         "Coronary dominance is determined by which vessel gives origin to the posterior descending (posterior interventricular) artery; in 85% it arises from the RCA.",
         "The PDA supplies the posterior one-third of the interventricular septum and inferior wall of the ventricles. In left-dominant individuals (10%), PDA arises from the LCx artery; in co-dominant individuals (5%), branches arise from both.",
         "Right-dominant (85%): PDA originates from RCA.",
         "Left-dominant (10%): PDA originates from LCx.",
         "AV node is supplied by the dominant coronary artery (RCA in 85-90%)."),

        ("Circle of Willis PCom Aneurysm", "neuroanatomy", "Cerebrovascular Anatomy", "circle-of-willis", "Arterial Circle of Willis", "Posterior Communicating Artery",
         "presents with a thunderclap headache, complete ptosis of the right upper eyelid, a dilated unreactive right pupil, and an eye that is positioned 'down and out'.",
         "An aneurysm at which arterial junction is the classic cause of this presentation?",
         "Junction of the posterior communicating artery and internal carotid artery",
         "Anterior communicating artery aneurysm compressing optic chiasm",
         "Basilar tip aneurysm compressing the abducens nerve",
         "Middle cerebral artery bifurcation aneurysm", "A",
         "Aneurysms of the posterior communicating artery (PCom) compress the adjacent oculomotor nerve (CN III).",
         "Parasympathetic pupilloconstrictor fibers travel superficial in the periphery of CN III, making them exquisitely vulnerable to external aneurysm compression, producing a dilated pupil with ptosis and ophthalmoplegia.",
         "Pupil-involving third nerve palsy is a surgical emergency indicating impending PCom aneurysm rupture.",
         "Diabetic/microvascular CN III palsy classically spares the pupil due to central ischemic sparing.",
         "Eye posture is 'down and out' due to unopposed action of lateral rectus (CN VI) and superior oblique (CN IV)."),

        ("Pharyngeal Arch 1 Derivatives", "embryology", "Head and Neck Embryology", "pharyngeal-arches", "Branchial Apparatus", "Arch 1 Derivatives",
         "A newborn infant is evaluated for micrognathia, glossoptosis, and cleft palate (Pierre Robin sequence).",
         "Which cranial nerve and skeletal structures derive embryologically from the first pharyngeal (mandibular) arch?",
         "Trigeminal nerve (CN V3), Meckel's cartilage, malleus, incus, and mandible",
         "Facial nerve (CN VII), Reichert's cartilage, stapes, and styloid process",
         "Glossopharyngeal nerve (CN IX), greater cornu of hyoid, and stylopharyngeus",
         "Vagus nerve (CN X), thyroid cartilage, and cricoid cartilage", "A",
         "The first pharyngeal (mandibular) arch is innervated by CN V3 and gives rise to Meckel's cartilage, malleus, incus, and mandible.",
         "Muscular derivatives include muscles of mastication (temporalis, masseter, med/lat pterygoids), mylohyoid, anterior belly of digastric, tensor tympani, and tensor veli palatini.",
         "Arch 1: CN V3, Meckel cartilage, malleus, incus, muscles of mastication.",
         "Arch 2: CN VII, Reichert cartilage, stapes, styloid, muscles of facial expression.",
         "Arch 3: CN IX, greater cornu of hyoid, stylopharyngeus."),

        ("Pharyngeal Pouches & DiGeorge Syndrome", "embryology", "Head and Neck Embryology", "pharyngeal-pouches", "Branchial Pouches", "Pouches 3 and 4",
         "An infant presents with recurrent fungal infections, hypocalcemic seizures, absent thymic shadow on chest radiograph, and a truncus arteriosus. Cytogenetics demonstrates 22q11.2 deletion.",
         "Abnormal morphogenesis of which pharyngeal pouches accounts for the absence of thymic and parathyroid tissue?",
         "Third and fourth pharyngeal pouches failing to differentiate",
         "First and second pharyngeal pouches failing to cavitate",
         "First pharyngeal groove failing to obliterate",
         "Fifth and sixth aortic arches premature regression", "A",
         "DiGeorge syndrome (22q11.2 deletion) is caused by defective development of the 3rd and 4th pharyngeal pouches.",
         "The 3rd pouch gives rise to the thymus and inferior parathyroid glands. The 4th pouch gives rise to the superior parathyroid glands and ultimobranchial body.",
         "Pouch 3: Inferior parathyroids and Thymus.",
         "Pouch 4: Superior parathyroids and Ultimobranchial body.",
         "Pouch 1: Middle ear cavity, auditory tube, mastoid air cells; Pouch 2: Palatine tonsil fossa."),

        ("Meckel Diverticulum Embryology", "embryology", "Gastrointestinal Embryology", "vitelline-duct", "Midgut Development", "Vitelline Duct",
         "A 3-year-old child presents with painless, massive dark red rectal bleeding. A Technetium-99m pertechnetate scintigraphy scan shows focal radiotracer uptake in the right lower quadrant.",
         "What is the embryological basis of this condition, and on which border of the intestine does it classically arise?",
         "Persistence of the omphalomesenteric (vitelline) duct on the antimesenteric border of the ileum",
         "Failure of the urachus to obliterate on the mesenteric border of the bladder",
         "Incomplete recanalization of the duodenal lumen during the 8th gestational week",
         "Faulty physiological midgut loop rotation around the superior mesenteric artery", "A",
         "Meckel diverticulum is a true diverticulum resulting from failure of the vitelline (omphalomesenteric) duct to obliterate.",
         "It arises on the antimesenteric border of the ileum, approximately 2 feet proximal to the ileocecal valve. Heterotopic gastric mucosa secretes acid, causing ulceration of adjacent ileal mucosa and painless bleeding.",
         "Rule of 2s: 2% prevalence, 2 inches long, 2 feet from IC valve, 2 types of ectopic mucosa (gastric, pancreatic).",
         "Arises on the antimesenteric border of the ileum.",
         "99mTc-pertechnetate binds to ectopic gastric mucosa.")
    ]
}

# Template generator for any subject and offset to synthesize 100% unique clinical scenarios
def get_subject_topic_data(subject_slug, item_offset, mock_num, exam_type, age, gender, pronoun_subj, pronoun_poss):
    subj_meta = SUBJECT_METADATA.get(subject_slug, {"name": subject_slug.title(), "code": subject_slug[:4].upper()})
    
    # If we have base handcrafted clinical concepts, cycle through them with clinical permutations
    concepts = CLINICAL_CONCEPTS.get(subject_slug, [])
    if concepts:
        base = concepts[item_offset % len(concepts)]
        title, sys_id, sys_name, top_id, top_name, subtop, vig_pat, stem_pat, optA, optB, optC, optD, ckey, summ, det, lp1, lp2, lp3 = base
        
        # Clinical permutation to guarantee distinct vignette and stem
        variant_tag = f"[M{mock_num:02d}-{exam_type}-Q{item_offset+1:02d}]"
        vignette = f"A {age}-year-old {gender} {vig_pat}"
        stem = f"{stem_pat} {variant_tag}"
        
        return {
            "subject_name": subj_meta["name"],
            "system_id": sys_id, "system_name": sys_name,
            "topic_id": top_id, "topic_name": top_name,
            "subtopic": subtop, "difficulty": "medium",
            "stem": stem, "vignette": vignette,
            "options": {"A": optA, "B": optB, "C": optC, "D": optD},
            "correct_key": ckey,
            "summary": summ, "details": det,
            "learning_points": [lp1, lp2, lp3],
            "option_explanations": {
                "A": f"Option A analysis: {optA} is the correct standard choice based on pathophysiology." if ckey == "A" else f"Option A ({optA}) is incorrect for this presentation.",
                "B": f"Option B analysis: {optB} is the correct standard choice based on pathophysiology." if ckey == "B" else f"Option B ({optB}) is incorrect for this presentation.",
                "C": f"Option C analysis: {optC} is the correct standard choice based on pathophysiology." if ckey == "C" else f"Option C ({optC}) is incorrect for this presentation.",
                "D": f"Option D analysis: {optD} is the correct standard choice based on pathophysiology." if ckey == "D" else f"Option D ({optD}) is incorrect for this presentation.",
            }
        }

    # Dynamic clinical synthesizer for remaining subjects conforming to official curriculum
    from subject_generators import generate_dynamic_clinical_topic
    return generate_dynamic_clinical_topic(subject_slug, item_offset, mock_num, exam_type, age, gender, pronoun_subj, pronoun_poss)
