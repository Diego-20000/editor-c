#include <stdio.h>
#define CERO 0.0
// segunda parte: con un decimal a la derecha el cero queda positivo
int main() {
    float X = 0.0f; double D = 0.0, Q; int C = 0;
    scanf("%f", &X);
    Q = 0 - X; printf("%a\n", Q);
    Q = 0 - D; printf("%a\n", Q);
    Q = CERO - D; printf("%a\n", Q);
    Q = (0.0) - D; printf("%a\n", Q);
    Q = 0.0 - (D + X); printf("%a\n", Q);
    Q = .0e5 - D; printf("%a\n", Q);
    Q = (float) 0 - X; printf("%a\n", Q);
    Q = (1 - 1) - D; printf("%a\n", Q);
    Q = D - 0.0; printf("%a\n", Q);
    Q = 0.0 + D; printf("%a\n", Q);
    Q = 0.0f - C; printf("%a %g %.1f\n", Q, Q, Q);
    return 0;
}
