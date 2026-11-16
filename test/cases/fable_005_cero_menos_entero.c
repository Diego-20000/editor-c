#include <stdio.h>
double ACF(double X) { if (X != X) return 0.5; if (X > 1e6) return 1e6; if (X < -1e6) return -1e6; return X; }
int main() {
    int C = 0, D = 5; double Q; float X = 0.0f;
    scanf("%d", &C);
    Q = ACF((0.0f - (C))); printf("%a %.4f\n", Q, Q);
    Q = 0.0f - C; printf("%a\n", Q);
    Q = 0.0 - C; printf("%a\n", Q);
    Q = X - C; printf("%a\n", Q);
    Q = 0.0f - (float) C; printf("%a\n", Q);
    Q = -C; printf("%a\n", Q);
    Q = -(float) C; printf("%a\n", Q);
    Q = C * -1.0; printf("%a\n", Q);
    Q = 0.0f - (C - D + 5); printf("%a\n", Q);
    return 0;
}
