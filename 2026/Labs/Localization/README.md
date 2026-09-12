# Lecture 5: Localization

Open `index.html` in a browser. No server, network connection, package installation, or ROS setup is required. The hosted version is [on the course portal](https://croquembouche.github.io/Intro2AV-CourseContent/localization/).

The teaching order is **ICP → AMCL → NDT**. Use Step to explain individual iterations or Play to animate; Reset returns to the selected scenario. Each estimator uses a synthetic 2D scene with a known map. Map coordinates and distances use meters; headings in the engine use radians.

- **ICP:** point-to-point nearest-neighbor registration, distance gating, and an analytic rigid 2D least-squares update. Compare nearby and poor initial guesses. Gray/orange line segments are the correspondences used for the last update; the orange scan shows the updated pose.
- **AMCL:** noisy body-frame odometry, endpoint likelihood-field measurements, and KLD adaptive resampling. Step cycles through prediction, measurement, and resampling. Purple arrow lengths encode relative weight. Global reinitialization samples uniformly across the room and headings. Kidnap changes only the simulated vehicle pose. Automatic recovery injection is intentionally omitted.
- **NDT:** cell means and regularized covariances, neighboring-cell Gaussian scores with an outlier floor, and monotonic coordinate-search updates. This is a transparent teaching implementation, not PCL’s production optimizer. Ellipses describe map geometry, not vehicle pose uncertainty.

The green ring is simulation truth, used only for generating observations and evaluating errors. The blue AMCL arrow is a weighted mean and can lie between modes. A stationary optimizer or concentrated particle cloud does not guarantee the true pose.

`gifs/` contains seven animations captured from the runnable demos. The lecture deck embeds these animated GIF bytes; animation playback depends on the presentation viewer. Browser GIFs are also available as a fallback.

Sources: [PCL ICP](https://pointclouds.org/documentation/tutorials/iterative_closest_point.html), [Nav2 AMCL](https://docs.nav2.org/jazzy/configuration_and_development/configuration_guide/others/configuring_amcl/), [PCL NDT](https://pointclouds.org/documentation/tutorials/normal_distributions_transform.html), [Fox, KLD-sampling](https://papers.neurips.cc/paper/1998-kld-sampling-adaptive-particle-filters.pdf).

## Direct interaction

Select a **Map action**, then click to place a pose or drag from the desired position toward its heading. Numeric pose fields provide the same actions without dragging.

- **Set scan pose guess** changes only the ICP/NDT estimate.
- **Place / kidnap vehicle** changes only the simulated vehicle and its scan. It does not inform the estimator.
- **Place AMCL prior** samples 800 particles around a user-specified pose with adjustable position spread; it does not move the vehicle.
- **Inspect** selects an ICP scan point and its current nearest neighbor, an AMCL particle and its projected scan, or an NDT cell and its statistics.

Use the drive buttons, or focus the map and press W/A/S/D or arrow keys. Wall checks prevent driving through map walls. Each AMCL move performs prediction, measurement, and resampling using commanded motion and the new observation; ICP/NDT retain the old estimate until you align the new scan. Sensor controls change the beam count and range noise of subsequent scans. AMCL odometry noise and measurement sigma are separately adjustable.
