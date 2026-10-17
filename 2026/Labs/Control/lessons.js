/* Concept-led cases: observations, not calculation exercises. */
(function(root){
const lessons={
  "pid": {
    "title": "PID speed control",
    "description": "Watch a vehicle hold speed on a hill and recover after braking.",
    "question": "Why might a vehicle stay a little too slow even while the controller keeps pushing?",
    "explanation": "P responds to the current speed gap. I builds a correction when that gap persists. D damps rapid changes in measured speed. Anti-windup pauses unhelpful buildup when the actuator is already at its limit.",
    "steps": [
      "Play P on a hill and watch the gap below the target.",
      "Switch to PI on a hill. Watch the remembered shortfall help close the gap.",
      "Compare the two braking cases. Look for overshoot and recovery."
    ],
    "checkpoint": "The hill needs sustained extra push. Integral action can supply it, but too much stored correction can delay recovery when the target changes. Anti-windup helps respect the actuator’s limits.",
    "presets": [
      [
        "p-hill",
        "P on a hill",
        {
          "ki": 0,
          "kd": 0,
          "grade": 0.8
        }
      ],
      [
        "pi-hill",
        "PI on a hill",
        {
          "ki": 0.3,
          "kd": 0,
          "grade": 0.8
        }
      ],
      [
        "windup",
        "Brake: no anti-windup",
        {
          "profile": "brake",
          "antiwindup": false
        }
      ],
      [
        "antiwindup",
        "Brake: anti-windup",
        {
          "profile": "brake",
          "antiwindup": true
        }
      ]
    ],
    "idea": "React now, remember a shortfall, and damp rapid changes."
  },
  "pure": {
    "title": "Pure Pursuit",
    "description": "Watch the vehicle turn toward a moving target ahead on the path.",
    "question": "Would a nearby target or a distant target usually lead to a sharper correction?",
    "explanation": "The orange point is the target. A nearby target usually produces a sharper response; a farther target tends to make steering gentler. Too much lookahead can cut corners or slow recovery.",
    "steps": [
      "Play Short lookahead and follow the orange point.",
      "Switch to Long lookahead and watch how the target and steering change.",
      "Try the faster case. Notice how the same steering choice has less time to work."
    ],
    "checkpoint": "Lookahead changes the geometry of the turn. Watch both how closely the car follows the path and how busy the steering becomes. Use the close-up to see angles and the full route to see the overall response.",
    "presets": [
      [
        "short",
        "Short lookahead",
        {
          "lookahead": 3
        }
      ],
      [
        "long",
        "Long lookahead",
        {
          "lookahead": 14
        }
      ],
      [
        "fast",
        "Short lookahead · faster vehicle",
        {
          "lookahead": 3,
          "speed": 16
        }
      ]
    ],
    "idea": "Aim ahead, move forward, and choose a new target."
  },
  "stanley": {
    "title": "Stanley",
    "description": "Watch the vehicle correct both its direction and its sideways position.",
    "question": "Can a car be close to the path while still pointing the wrong way?",
    "explanation": "Stanley combines heading alignment with a sideways correction at the front axle. The magenta line shows that sideways gap. Stronger corrections can arrive too late when there is delay.",
    "steps": [
      "Compare Gentle gain and Strong gain. Watch how quickly each tries to recover.",
      "Play Strong gain + delay. Look for repeated side-to-side corrections.",
      "Use the steering plot to connect late actions with the vehicle’s motion."
    ],
    "checkpoint": "Position and direction both matter. A strong correction can overshoot when it acts late. The front axle guides Stanley’s correction; the shared error plot measures every controller at the rear axle.",
    "presets": [
      [
        "gentle",
        "Gentle gain",
        {
          "gain": 0.5
        }
      ],
      [
        "strong",
        "Strong gain",
        {
          "gain": 4
        }
      ],
      [
        "delayed",
        "Strong gain + delay",
        {
          "gain": 4,
          "delay": 0.3
        }
      ]
    ],
    "idea": "Point along the path and bring the front axle toward it."
  },
  "lqr": {
    "title": "Linear Quadratic Regulator",
    "description": "See how a model-based feedback rule balances tracking with steering effort.",
    "question": "What might you give up if you discourage large steering corrections?",
    "explanation": "LQR uses a simplified model to design a feedback rule. Tracking priority favors reducing error; steering penalty discourages large commands. Those preferences are different from physical limits.",
    "steps": [
      "Play Balanced weights to see the starting behavior.",
      "Switch between Tracking priority and Steering penalty. Watch error and steering together.",
      "Try Limited actuator. Can the vehicle carry out the response the controller wants?"
    ],
    "checkpoint": "LQR balances competing goals under its model assumptions. In this demo, actuator limits and lag are outside that design. A physically limited response can therefore differ from the response the feedback rule expects.",
    "presets": [
      [
        "balanced",
        "Balanced weights",
        {
          "q": 1,
          "r": 15
        }
      ],
      [
        "track",
        "Tracking priority",
        {
          "q": 10,
          "r": 15
        }
      ],
      [
        "smooth",
        "Steering penalty",
        {
          "q": 1,
          "r": 40
        }
      ],
      [
        "limited",
        "Limited actuator",
        {
          "q": 1,
          "r": 15,
          "rate": 20
        }
      ]
    ],
    "idea": "Use a model to choose how strongly to correct the error."
  },
  "mpc": {
    "title": "Model Predictive Control",
    "description": "Watch a controller plan ahead, use one action, and update the plan.",
    "question": "Why should the controller measure again before following the rest of its plan?",
    "explanation": "The green path is a prediction. The steering sequence is a provisional plan. Only the orange first point is used next; new measurements can change the rest. Physical limits restrict the choices the controller can plan.",
    "steps": [
      "Compare Short horizon and Long horizon. Watch the length of the green preview.",
      "Play the two tight-limit cases. Notice how limited steering changes the response.",
      "Try the delayed case and compare the prediction with what the vehicle actually does."
    ],
    "checkpoint": "More preview can reveal an upcoming bend earlier, but it does not guarantee a better result. Predictions can be wrong: this predictor omits the actuator’s lag, extra delay, and bias. Replanning uses fresh measurements to adjust the next action.",
    "presets": [
      [
        "short",
        "Short horizon",
        {
          "road": "lane",
          "speed": 12,
          "horizon": 8
        }
      ],
      [
        "long",
        "Long horizon",
        {
          "road": "lane",
          "speed": 12,
          "horizon": 32
        }
      ],
      [
        "tight-short",
        "Short horizon + tight limits",
        {
          "road": "lane",
          "speed": 12,
          "horizon": 8,
          "limit": 10,
          "rate": 25
        }
      ],
      [
        "tight-long",
        "Long horizon + tight limits",
        {
          "road": "lane",
          "speed": 12,
          "horizon": 32,
          "limit": 10,
          "rate": 25
        }
      ],
      [
        "delay",
        "Long horizon + delay",
        {
          "road": "lane",
          "speed": 12,
          "horizon": 32,
          "delay": 0.2
        }
      ]
    ],
    "idea": "Predict ahead, act once, then replan."
  },
  "compare": {
    "title": "Controller comparison",
    "description": "Watch four independent vehicles follow the same path under the same conditions.",
    "question": "Does the car closest to the path also make the gentlest steering corrections?",
    "explanation": "Pure Pursuit, Stanley, LQR and MPC receive the same path, speed and actuator conditions. Their tuning is illustrative. PID controls speed in its separate demonstration.",
    "steps": [
      "Play Baseline and watch the colored paths.",
      "Switch to Added delay. Look for a change in recovery or repeated swings.",
      "Compare tracking and steering behavior. Explain which tradeoff you prefer in this scene."
    ],
    "checkpoint": "No ranking is universal. A smaller typical error can hide a large miss or aggressive steering. Different tuning, speed or delay can change the comparison; sometimes the right response is to slow down or change the plan.",
    "presets": [
      [
        "baseline",
        "Baseline",
        {}
      ],
      [
        "delay",
        "Added delay",
        {
          "delay": 0.2
        }
      ],
      [
        "rate",
        "Slower steering",
        {
          "rate": 25
        }
      ],
      [
        "speed",
        "Faster vehicle",
        {
          "speed": 16
        }
      ]
    ],
    "idea": "Judge the response in context, using more than one view."
  }
};
if(typeof module!=='undefined')module.exports=lessons;root.ControlLessons=lessons;
})(typeof window==='undefined'?globalThis:window);
