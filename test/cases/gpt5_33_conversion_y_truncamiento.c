#include <stdio.h>
int main() {
    int ORIGINAL = 16777217;
    float F = ORIGINAL;
    int RECUPERADO = F;
    double D = -3.9;
    int TRUNCADO = D;
    printf("%d %d %d\n", ORIGINAL, RECUPERADO, TRUNCADO);
}
