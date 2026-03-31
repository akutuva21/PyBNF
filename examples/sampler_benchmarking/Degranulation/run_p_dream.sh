#!/bin/bash
#SBATCH --job-name=degran_p_dream
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=24
#SBATCH --mem=100G
#SBATCH --time=5-00:00:00
#SBATCH --output=%x_%j.out
#SBATCH --error=%x_%j.err

# Load your Python environment (adjust for your cluster)
# module purge
# module load anaconda3/2023.09
# Or: source activate pybnf

# Uncomment and set BNGPATH for BioNetGen models
# export BNGPATH=/path/to/BioNetGen

# To start fresh: sbatch run_p_dream.sh
# To resume/continue: RESUME_ITERS=5000 sbatch run_p_dream.sh
if [ -n "$RESUME_ITERS" ]; then
    echo "Resuming with $RESUME_ITERS additional iterations..."
    pybnf -r "$RESUME_ITERS" -c p_dream.conf -t SLURM
else
    pybnf -c p_dream.conf -t SLURM -o
fi
