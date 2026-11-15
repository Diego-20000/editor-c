#include <stdio.h>
#include <math.h>
int main() { double X; char T[30]; int N, K;
  for (K = 0; K < 8; K++) { X = -1; T[0] = 0; N = scanf("%lf%s", &X, T); printf("%d %g [%s]\n", N, X, T); if (N < 2) { scanf("%*[^\n]"); } }
  float F = NAN, G; double D = NAN; G = F; printf("%f %f %f %f %f\n", F, G, D, -F, (float) D); F = sqrt(-1.0); printf("%f\n", F);
  return 0; }
