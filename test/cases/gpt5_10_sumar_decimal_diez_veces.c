#include <stdio.h>
int main() {
    double S = 0.0;
    int I;
    for (I = 0; I < 10; I++) S += 0.1;
    printf("%d %.17f\n", S == 1.0, S);
}
