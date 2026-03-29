#!/bin/bash
#SBATCH --job-name=gauss10_s_cream
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=24
#SBATCH --mem=16G
#SBATCH --time=1-00:00:00
#SBATCH --output=%x_%j.out
#SBATCH --error=%x_%j.err

# Load your Python environment (adjust for your cluster)
# module purge
# module load anaconda3/2023.09
# Or: source activate pybnf

# To start fresh: sbatch run_s_cream.sh
# To resume/continue: RESUME_ITERS=5000 sbatch run_s_cream.sh
if [ -n "$RESUME_ITERS" ]; then
    echo "Resuming with $RESUME_ITERS additional iterations..."
    pybnf -r "$RESUME_ITERS" -c s_cream.conf
else
    pybnf -c s_cream.conf -o
fi
